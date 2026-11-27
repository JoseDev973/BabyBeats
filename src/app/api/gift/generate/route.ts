import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getAppUrl } from "@/lib/utils";
import { FROM_ADDRESS, getResend } from "@/lib/resend";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GIFT_PACKS_COP, isGiftPack } from "@/lib/mercado-pago/config";
import { startSunoGeneration, SunoSubmissionRejected } from "@/lib/suno";
import { parseSongBrief } from "@/lib/song-prompts";
import { generateLyrics } from "@/lib/generate-lyrics";
import { MAX_LYRICS_LENGTH } from "@/lib/lyrics-limits";
import type { GiftSong } from "@/types/database";

// Up to 10 songs (Claude lyrics + Suno kickoff) run in parallel
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { giftId } = body ?? {};

  if (!giftId || typeof giftId !== "string") {
    return NextResponse.json(
      { error: "Missing required field: giftId" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();

  const { data: draftGift } = await admin
    .from("gifts")
    .select("paid_at, pack_type, gift_songs(count)")
    .eq("id", giftId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (!draftGift) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }

  // #21: no generation without a confirmed payment
  if (!draftGift.paid_at) {
    return NextResponse.json({ error: "PAYMENT_REQUIRED" }, { status: 402 });
  }

  const packType: unknown = draftGift.pack_type;
  if (!isGiftPack(packType)) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  const maxSongs = GIFT_PACKS_COP[packType].songs;
  // Saved tracks keep the style selected at purchase, even when an audition
  // has since closed. A first-time configuration uses the current options.
  const settings = draftGift.gift_songs[0]?.count > 0 ? null : body.settings;
  if (settings != null) {
    const basics = { childName: settings.childName, language: settings.language };
    const valid = settings.deliveryMode === "redeem"
      ? parseSongBrief({ ...basics, theme: "lullaby" })
      : settings.deliveryMode === "link" && Array.isArray(settings.songs) && settings.songs.length === maxSongs &&
        settings.songs.every((song: { theme?: string; style?: string; prompt?: string } | null) =>
          song && typeof song.style === "string" &&
          parseSongBrief({ ...basics, theme: song.theme, musicStyle: song.style, customPrompt: song.prompt }));
    if (!valid || typeof settings.language !== "string") {
      return NextResponse.json({ error: "Invalid gift settings" }, { status: 400 });
    }
  }

  const { data: gift, error: prepareError } = await admin.rpc("prepare_paid_gift", {
    p_gift_id: giftId,
    p_buyer_id: user.id,
    p_settings: settings ?? null,
    p_song_count: maxSongs,
  });
  if (prepareError || !gift) {
    console.error("[gift/generate] Could not prepare gift", prepareError?.code);
    return NextResponse.json({ error: "Could not prepare gift" }, { status: 500 });
  }
  if (gift.issued_voucher && user.email) {
    try {
      const locale = hasLocale(routing.locales, body.locale) ? body.locale : routing.defaultLocale;
      const t = await getTranslations({ locale, namespace: "gift" });
      const redeemUrl = new URL(`/${locale}/gift/redeem/${encodeURIComponent(gift.delivery_token)}`, getAppUrl());
      const { error } = await getResend().emails.send({
        from: FROM_ADDRESS, to: user.email, subject: t("codeReady"),
        text: `${t("shareRedeemLink", { name: gift.child_name })}

${redeemUrl}`,
      }, { idempotencyKey: `gift-voucher/${giftId}` });
      if (error) throw error;
    } catch (error) {
      console.error("[gift/generate] Could not email the voucher", error);
    }
  }
  if (gift.status !== "started") {
    return NextResponse.json({
      giftId, status: gift.status, deliveryToken: gift.delivery_token, deliveryMode: gift.delivery_mode,
    });
  }

  const songs = gift.starts as (GiftSong & { start_attempt: string })[];
  const results = await Promise.allSettled(
    songs.map(async (song) => {
      // A signed provider callback may already have bound the task or a retry
      // may own this track. Only the worker holding this lease may write it.
      const saveStart = (values: Record<string, unknown>) => admin.from("gift_songs")
        .update(values).eq("id", song.id).eq("start_attempt", song.start_attempt)
        .is("suno_task_id", null).not("start_expires_at", "is", null);
      let submitted = false;
      try {
        const brief = parseSongBrief({
          childName: gift.child_name, theme: song.theme, musicStyle: song.music_style,
          language: song.language || gift.language || "es", customPrompt: song.custom_prompt,
        }, "saved");
        if (!brief) throw new Error("Invalid gift song details");
        const lyrics = song.lyrics?.trim() && song.lyrics.length <= MAX_LYRICS_LENGTH
          ? song.lyrics : await generateLyrics(brief);

        const { data: current } = await saveStart({ lyrics }).select("id").maybeSingle().throwOnError();
        if (!current) return;
        submitted = true;
        const taskId = await startSunoGeneration({
          callbackTarget: { kind: "gift", id: song.id, attempt: song.start_attempt },
          lyrics,
          musicStyle: brief.musicStyle, theme: brief.theme,
          language: brief.language, childName: brief.childName,
        });
        await saveStart({ suno_task_id: taskId, status: "generating", start_expires_at: null }).throwOnError();
      } catch (error) {
        if (!submitted || error instanceof SunoSubmissionRejected) {
          await saveStart({ status: "failed", start_attempt: null, start_expires_at: null }).throwOnError();
        }
        // A lost response can still produce a callback. Keep that attempt
        // recoverable until its lease expires.
        throw error;
      }
    }),
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    for (const f of failed) {
      console.error("[Gift Generate] Song failed:", (f as PromiseRejectedResult).reason);
    }
    return NextResponse.json(
      { error: "GENERATION_FAILED", failed: failed.length, total: songs.length },
      { status: 502 },
    );
  }

  return NextResponse.json({
    giftId,
    status: "generating",
    deliveryMode: gift.delivery_mode,
    totalSongs: maxSongs,
  });
}
