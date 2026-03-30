import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SUNO_API_BASE = "https://api.sunoapi.org/api/v1";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { songId } = await request.json();

  const { data: song, error: songError } = await supabase
    .from("generated_songs")
    .select("*")
    .eq("id", songId)
    .eq("user_id", user.id)
    .single();

  if (songError || !song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  if (song.status === "completed") {
    return NextResponse.json(
      { error: "Song audio has already been generated" },
      { status: 400 },
    );
  }

  if (!song.lyrics) {
    return NextResponse.json(
      { error: "Song has no lyrics yet" },
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

  try {
    const styleMap: Record<string, string> = {
      gentle: "gentle, soft, lullaby, children's music",
      playful: "playful, upbeat, happy, children's music",
      classical: "classical, orchestral, children's music",
      pop: "pop, catchy, children's music",
      acoustic: "acoustic, folk, warm, children's music",
      reggaeton: "reggaeton, latin, kids, fun, children's music",
    };

    const style = styleMap[song.music_style] || "children's music, gentle";

    // Start Suno generation (non-blocking)
    const res = await fetch(`${SUNO_API_BASE}/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUNO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: song.lyrics,
        customMode: true,
        style,
        title: `${song.child_name}'s Song`,
        instrumental: false,
        model: "V4",
        callBackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/suno`,
      }),
    });

    const result = await res.json();

    if (result.code !== 200 || !result.data?.taskId) {
      throw new Error(result.msg || "Failed to start Suno generation");
    }

    // Save taskId and mark as generating — return immediately
    await supabase
      .from("generated_songs")
      .update({
        status: "generating",
        suno_task_id: result.data.taskId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", songId);

    // Deduct credit
    if (!isFirstSong) {
      await supabase
        .from("profiles")
        .update({ credits: (profile?.credits ?? 1) - 1 })
        .eq("id", user.id);
    }

    await supabase
      .from("profiles")
      .update({
        total_songs_generated: (profile?.total_songs_generated ?? 0) + 1,
      })
      .eq("id", user.id);

    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: -1,
      type: "usage",
      description: `Generated song for ${song.child_name}`,
    });

    return NextResponse.json({
      taskId: result.data.taskId,
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
