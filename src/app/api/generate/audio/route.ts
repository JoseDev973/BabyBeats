import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { startSunoGeneration } from "@/lib/suno";
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

  const { data: song, error: songError } = await supabase
    .from("generated_songs")
    .select("*")
    .eq("id", songId)
    .eq("user_id", user.id)
    .single();

  if (songError || !song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  if (song.status === "generating" || song.status === "completed") {
    return NextResponse.json(
      { songId, status: song.status },
    );
  }

  const lyrics = editedLyrics === undefined ? song.lyrics : editedLyrics;
  if (typeof lyrics !== "string" || !lyrics.trim() || lyrics.length > MAX_LYRICS_LENGTH) {
    return NextResponse.json(
      { error: `Lyrics must contain between 1 and ${MAX_LYRICS_LENGTH} characters.` },
      { status: 400 },
    );
  }

  // Check credits
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, total_songs_generated")
    .eq("id", user.id)
    .single();

  const isFirstSong = (profile?.total_songs_generated ?? 0) === 0;
  const hasCredits = (profile?.credits ?? 0) > 0 || isFirstSong;

  if (!hasCredits) {
    return NextResponse.json(
      { error: "No credits remaining. Please purchase more." },
      { status: 402 },
    );
  }

  if (lyrics !== song.lyrics) {
    const { data: draft, error } = await supabase
      .from("generated_songs")
      .update({ lyrics })
      .eq("id", songId)
      .eq("user_id", user.id)
      .in("status", ["lyrics_ready", "failed"])
      .select("id")
      .maybeSingle();

    if (error || !draft) {
      return NextResponse.json({ error: "Could not save the lyrics. Please retry." }, { status: error ? 500 : 409 });
    }
  }

  try {
    // Atomic increment to prevent race condition on first free song
    // Done BEFORE Suno call so parallel requests see total_songs_generated > 0
    const currentTotal = profile?.total_songs_generated ?? 0;
    const { data: lockResult, error: lockError } = await getSupabaseAdmin()
      .from("profiles")
      .update({
        total_songs_generated: currentTotal + 1,
      })
      .eq("id", user.id)
      .eq("total_songs_generated", currentTotal)
      .select("total_songs_generated")
      .single();

    if (lockError || !lockResult) {
      // Another request already incremented — abort to prevent double free song
      await supabase
        .from("generated_songs")
        .update({ status: "failed" })
        .eq("id", songId);
      return NextResponse.json(
        { error: "Concurrent request conflict. Please try again." },
        { status: 409 },
      );
    }

    // Start Suno generation (non-blocking; result arrives via webhook)
    const taskId = await startSunoGeneration({
      lyrics,
      musicStyle: song.music_style,
      theme: song.theme,
      language: song.language || "es",
      childName: song.child_name,
    });

    // Save taskId and mark as generating — return immediately
    await supabase
      .from("generated_songs")
      .update({
        status: "generating",
        suno_task_id: taskId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", songId);

    // Deduct credit (atomic: only succeeds if credits haven't changed)
    if (!isFirstSong) {
      const expectedCredits = profile?.credits ?? 1;
      const { data: updated, error: creditError } = await getSupabaseAdmin()
        .from("profiles")
        .update({ credits: expectedCredits - 1 })
        .eq("id", user.id)
        .eq("credits", expectedCredits)
        .select("credits")
        .single();

      if (creditError || !updated) {
        // Credits changed between read and write — abort
        await supabase
          .from("generated_songs")
          .update({ status: "failed" })
          .eq("id", songId);
        return NextResponse.json(
          { error: "Credit conflict. Please try again." },
          { status: 409 },
        );
      }
    }

    // total_songs_generated already incremented above (optimistic lock)

    await getSupabaseAdmin().from("credit_transactions").insert({
      user_id: user.id,
      amount: -1,
      type: "usage",
      description: `Generated song for ${song.child_name}`,
    });

    return NextResponse.json({
      taskId: taskId,
      songId,
      status: "generating",
    });
  } catch (err) {
    await supabase
      .from("generated_songs")
      .update({ status: "failed" })
      .eq("id", songId);

    const message =
      err instanceof Error ? err.message : "Audio generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
