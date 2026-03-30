import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { songId } = await request.json();

  // Get the song and verify ownership
  const { data: song, error: songError } = await supabase
    .from("generated_songs")
    .select("*")
    .eq("id", songId)
    .eq("user_id", user.id)
    .single();

  if (songError || !song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  if (song.status !== "lyrics_ready") {
    return NextResponse.json(
      { error: "Song is not ready for audio generation" },
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

  // Mark as generating
  await supabase
    .from("generated_songs")
    .update({ status: "generating" })
    .eq("id", songId);

  try {
    // === SUNO API INTEGRATION ===
    // When you have a Suno API key, replace this block with actual Suno API calls.
    // Suno API: https://docs.suno.com/api
    //
    // Example Suno integration:
    // const sunoResponse = await fetch("https://studio-api.suno.ai/api/external/generate/", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${process.env.SUNO_API_KEY}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     topic: song.lyrics,
    //     tags: `${song.music_style}, children's music, baby song`,
    //   }),
    // });

    // For now, mark as completed with a placeholder
    // In production, you would:
    // 1. Call Suno API to generate audio
    // 2. Upload the audio to Supabase Storage
    // 3. Save the public URL

    // Simulate: store lyrics as completed (audio URL will be set when Suno is integrated)
    const { error: updateError } = await supabase
      .from("generated_songs")
      .update({
        status: "completed",
        // audio_url will be set when Suno API is integrated
        updated_at: new Date().toISOString(),
      })
      .eq("id", songId);

    if (updateError) throw updateError;

    // Deduct credit (skip if first song)
    if (!isFirstSong) {
      await supabase
        .from("profiles")
        .update({ credits: (profile?.credits ?? 1) - 1 })
        .eq("id", user.id);
    }

    // Increment total generated
    await supabase
      .from("profiles")
      .update({
        total_songs_generated: (profile?.total_songs_generated ?? 0) + 1,
      })
      .eq("id", user.id);

    // Log credit transaction
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: -1,
      type: "usage",
      description: `Generated song for ${song.child_name}`,
    });

    return NextResponse.json({
      audioUrl: song.audio_url || null,
      status: "completed",
      message:
        "Song generation complete. Audio will be available when Suno API is configured.",
    });
  } catch (err) {
    await supabase
      .from("generated_songs")
      .update({ status: "failed" })
      .eq("id", songId);

    const message = err instanceof Error ? err.message : "Audio generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
