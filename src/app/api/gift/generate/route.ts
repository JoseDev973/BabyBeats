import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GIFT_PACKS_COP, isGiftPack } from "@/lib/mercado-pago/config";
import { startSunoGeneration } from "@/lib/suno";
import { generateLyrics } from "@/lib/generate-lyrics";
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

  const { giftId } = await request.json().catch(() => ({}));

  if (!giftId || typeof giftId !== "string") {
    return NextResponse.json(
      { error: "Missing required field: giftId" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();

  const { data: gift } = await admin
    .from("gifts")
    .select("*")
    .eq("id", giftId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (!gift) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }

  // #21: no generation without a confirmed payment
  if (!gift.paid_at) {
    return NextResponse.json({ error: "PAYMENT_REQUIRED" }, { status: 402 });
  }

  const packType: unknown = gift.pack_type;
  if (!isGiftPack(packType)) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  if (!gift.child_name || gift.child_name === "—") {
    return NextResponse.json({ error: "Missing child name" }, { status: 400 });
  }

  // Claim the gift atomically so concurrent/double requests can't generate twice
  const { data: claimed } = await admin
    .from("gifts")
    .update({ status: "generating", updated_at: new Date().toISOString() })
    .eq("id", giftId)
    .in("status", ["draft", "personalizing"])
    .select("id")
    .maybeSingle();

  if (!claimed) {
    return NextResponse.json(
      { error: "GIFT_ALREADY_PROCESSING" },
      { status: 400 },
    );
  }

  // Only as many songs as the pack paid for; skip ones already started
  const maxSongs = GIFT_PACKS_COP[packType].songs;
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
    await admin.from("gifts").update({ status: "personalizing" }).eq("id", giftId);
    return NextResponse.json(
      { error: "No songs found for this gift" },
      { status: 404 },
    );
  }

  const results = await Promise.allSettled(
    songs.map(async (song) => {
      const lyrics = await generateLyrics({
        childName: gift.child_name,
        theme: song.theme,
        musicStyle: song.music_style,
        language: song.language || gift.language || "es",
        customPrompt: song.custom_prompt,
      });
      await admin.from("gift_songs").update({ lyrics }).eq("id", song.id);

      const taskId = await startSunoGeneration({
        lyrics,
        musicStyle: song.music_style,
        theme: song.theme,
        language: song.language || gift.language || "es",
        childName: gift.child_name,
      });

      await admin
        .from("gift_songs")
        .update({ suno_task_id: taskId, status: "generating" })
        .eq("id", song.id);
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
      .eq("id", giftId);
    return NextResponse.json(
      { error: "GENERATION_FAILED", failed: failed.length, total: songs.length },
      { status: 502 },
    );
  }

  return NextResponse.json({
    giftId,
    status: "generating",
    totalSongs: giftSongs.length,
  });
}
