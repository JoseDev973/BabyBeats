import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SUNO_API_BASE = "https://api.sunoapi.org/api/v1";

async function sunoFetch(path: string, options?: RequestInit) {
  return fetch(`${SUNO_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.SUNO_API_KEY}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

async function pollForCompletion(taskId: string): Promise<{ audioUrl: string; duration: number }> {
  const maxAttempts = 40; // ~5 minutes (40 * 8s)

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 8000));

    const res = await sunoFetch(`/generate/record-info?taskId=${taskId}`);
    const data = await res.json();

    if (data.data?.status === "SUCCESS") {
      const track = data.data.response?.data?.[0];
      if (track?.audio_url) {
        return {
          audioUrl: track.audio_url,
          duration: Math.round(track.duration || 0),
        };
      }
      throw new Error("Generation succeeded but no audio URL returned");
    }

    if (data.data?.status === "FAILED") {
      throw new Error("Suno generation failed");
    }
  }

  throw new Error("Generation timed out after 5 minutes");
}

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
    // Build the Suno prompt with custom mode for lyrics
    const styleMap: Record<string, string> = {
      gentle: "gentle, soft, lullaby, children's music",
      playful: "playful, upbeat, happy, children's music",
      classical: "classical, orchestral, children's music",
      pop: "pop, catchy, children's music",
      acoustic: "acoustic, folk, warm, children's music",
      reggaeton: "reggaeton, latin, kids, fun, children's music",
    };

    const style = styleMap[song.music_style] || "children's music, gentle";

    const res = await sunoFetch("/generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: song.lyrics,
        customMode: true,
        style,
        title: `${song.child_name}'s Song`,
        instrumental: false,
        model: "V4",
      }),
    });

    const result = await res.json();

    if (result.code !== 200 || !result.data?.taskId) {
      throw new Error(result.msg || "Failed to start Suno generation");
    }

    // Poll until complete
    const { audioUrl, duration } = await pollForCompletion(result.data.taskId);

    // Update song with audio URL
    await supabase
      .from("generated_songs")
      .update({
        status: "completed",
        audio_url: audioUrl,
        duration_seconds: duration,
        is_public: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", songId);

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

    return NextResponse.json({ audioUrl, status: "completed" });
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
