import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { startSunoGeneration } from "@/lib/suno";
import { expireInterruptedSongStarts } from "@/lib/expire-song-starts";
import { MAX_LYRICS_LENGTH } from "@/lib/lyrics-limits";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const { success, remaining } = rateLimit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.songId !== "string") {
    return NextResponse.json({ error: "Missing song ID" }, { status: 400 });
  }
  const { songId, lyrics: editedLyrics } = body;

  if (editedLyrics !== undefined && (
    typeof editedLyrics !== "string" || !editedLyrics.trim() || editedLyrics.length > MAX_LYRICS_LENGTH
  )) {
    return NextResponse.json(
      { error: `Lyrics must contain between 1 and ${MAX_LYRICS_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  await expireInterruptedSongStarts(user.id);
  const { data: song, error } = await admin.rpc("reserve_song_audio", {
    p_user_id: user.id,
    p_song_id: songId,
    p_lyrics: editedLyrics ?? null,
  });
  if (error) {
    return NextResponse.json({ error: "Could not reserve this song." }, {
      status: error.code === "22P02" ? 400 : 500,
    });
  }
  switch (song.outcome) {
    case "generating":
    case "completed":
      return NextResponse.json({ songId, status: song.outcome, taskId: song.task_id });
    case "not_found":
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    case "invalid_draft":
      return NextResponse.json({ error: "Song needs valid lyrics" }, { status: 400 });
    case "no_credits":
      return NextResponse.json({ error: "No credits remaining. Please purchase more." }, { status: 402 });
    case "reserved":
      break;
    default:
      return NextResponse.json({ error: "Could not reserve this song." }, { status: 500 });
  }

  // Only the request that created this reservation may submit or release it.
  let taskId: string;
  try {
    taskId = await startSunoGeneration({
      lyrics: song.lyrics,
      musicStyle: song.music_style,
      theme: song.theme,
      language: song.language || "es",
      childName: song.child_name,
      callbackTarget: { kind: "song", id: song.id },
    });
  } catch (err) {
    const { error: releaseError } = await admin.from("generated_songs")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", songId).eq("audio_reservation_id", song.attempt);
    if (releaseError) console.error("Could not release song reservation", songId, releaseError.code);
    const message = err instanceof Error ? err.message : "Audio generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { data: saved, error: saveError } = await admin.from("generated_songs")
    .update({ suno_task_id: taskId, updated_at: new Date().toISOString() })
    .eq("id", songId).eq("audio_reservation_id", song.attempt)
    .select("id").maybeSingle();
  if (saveError || !saved) {
    console.error("Could not attach provider task to song", songId, taskId);
    return NextResponse.json({ error: "Could not confirm audio generation." }, { status: 503 });
  }

  return NextResponse.json({ taskId, songId, status: "generating" });
}
