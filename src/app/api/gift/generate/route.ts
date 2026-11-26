import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GIFT_PACKS_COP, isGiftPack } from "@/lib/mercado-pago/config";
import { startSunoGeneration } from "@/lib/suno";
import { buildLyricsPrompt } from "@/lib/song-prompts";
import type { GiftSong, SongTheme } from "@/types/database";

async function generateLyrics(
  childName: string,
  theme: SongTheme,
  musicStyle: string,
  language: string,
  customPrompt: string | null,
): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const message = await new Anthropic().messages.create({
    model: "claude-opus-5",
    // max_tokens covers thinking + text on claude-opus-5
    max_tokens: 10000,
    messages: [
      {
        role: "user",
        content: buildLyricsPrompt({
          childName: childName.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, "").slice(0, 50),
          theme,
          musicStyle,
          language,
          customPrompt,
        }),
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}

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
  const { giftId, settings } = body ?? {};

  if (!giftId || typeof giftId !== "string") {
    return NextResponse.json(
      { error: "Missing required field: giftId" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();

  const { data: draftGift } = await admin
    .from("gifts")
    .select("paid_at, pack_type")
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
  if (settings != null && (
    typeof settings.childName !== "string" || !settings.childName.trim() || settings.childName.length > 100 ||
    typeof settings.language !== "string" || !settings.language.trim() || settings.language.length > 32 ||
    !["link", "redeem"].includes(settings.deliveryMode) ||
    (settings.deliveryMode === "link" && (
      !Array.isArray(settings.songs) || settings.songs.length !== maxSongs ||
      !settings.songs.every((song: { theme?: string; style?: string; prompt?: string } | null) =>
        song && ["lullaby", "educational", "fun"].includes(song.theme ?? "") &&
        typeof song.style === "string" && song.style.trim() && song.style.length <= 64 &&
        typeof song.prompt === "string" && song.prompt.length <= 500
      )
    ))
  )) {
    return NextResponse.json({ error: "Invalid gift settings" }, { status: 400 });
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
  if (gift.status !== "started") {
    return NextResponse.json({
      giftId, status: gift.status, deliveryToken: gift.delivery_token, deliveryMode: gift.delivery_mode,
    });
  }

  const { data: giftSongs } = await admin
    .from("gift_songs")
    .select("*")
    .eq("gift_id", giftId)
    .order("position")
    .limit(maxSongs);

  const songs = ((giftSongs as GiftSong[]) || []).filter(
    (s) => !s.suno_task_id && s.status !== "completed",
  );

  if (!giftSongs || giftSongs.length === 0) {
    await admin.from("gifts").update({ status: "personalizing" }).eq("id", giftId).eq("status", "generating");
    return NextResponse.json(
      { error: "No songs found for this gift" },
      { status: 404 },
    );
  }

  const results = await Promise.allSettled(
    songs.map(async (song) => {
      const lyrics = await generateLyrics(
        gift.child_name,
        song.theme as SongTheme,
        song.music_style,
        song.language || gift.language || "es",
        song.custom_prompt,
      );
      if (!lyrics.trim()) throw new Error("Empty lyrics");

      await admin.from("gift_songs").update({ lyrics }).eq("id", song.id);

      const taskId = await startSunoGeneration({
        lyrics,
        musicStyle: song.music_style,
        theme: song.theme,
        language: song.language || gift.language || "es",
        childName: gift.child_name,
      });

      const { error: taskError } = await admin
        .from("gift_songs")
        .update({ suno_task_id: taskId, status: "generating" })
        .eq("id", song.id);
      if (taskError) throw taskError;
    }),
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    for (const f of failed) {
      console.error("[Gift Generate] Song failed:", (f as PromiseRejectedResult).reason);
    }
    // Release the gift so the buyer can retry; songs already started are skipped
    await admin
      .from("gifts")
      .update({ status: "personalizing", updated_at: new Date().toISOString() })
      .eq("id", giftId)
      .eq("status", "generating");
    return NextResponse.json(
      { error: "GENERATION_FAILED", failed: failed.length, total: songs.length },
      { status: 502 },
    );
  }

  return NextResponse.json({
    giftId,
    status: "generating",
    deliveryMode: gift.delivery_mode,
    totalSongs: giftSongs.length,
  });
}
