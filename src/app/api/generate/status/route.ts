import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SUNO_API_BASE = "https://api.sunoapi.org/api/v1";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const songId = searchParams.get("songId");

  if (!songId) {
    return NextResponse.json({ error: "Missing songId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: song } = await supabase
    .from("generated_songs")
    .select("*")
    .eq("id", songId)
    .eq("user_id", user.id)
    .single();

  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  // If already completed or failed, return current state
  if (song.status === "completed" || song.status === "failed") {
    return NextResponse.json({
      status: song.status,
      audioUrl: song.audio_url,
      childName: song.child_name,
      shareToken: song.share_token,
    });
  }

  // If generating, check Suno status
  if (song.status === "generating" && song.suno_task_id) {
    try {
      const res = await fetch(
        `${SUNO_API_BASE}/generate/record-info?taskId=${song.suno_task_id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.SUNO_API_KEY}`,
          },
        },
      );

      const data = await res.json();
      const sunoStatus = data.data?.status;

      if (sunoStatus === "SUCCESS") {
        const track = data.data.response?.data?.[0];
        const audioUrl = track?.audio_url;
        const duration = Math.round(track?.duration || 0);

        if (audioUrl) {
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

          return NextResponse.json({
            status: "completed",
            audioUrl,
            childName: song.child_name,
            shareToken: song.share_token,
          });
        }
      }

      if (sunoStatus === "FAILED") {
        await supabase
          .from("generated_songs")
          .update({ status: "failed" })
          .eq("id", songId);

        return NextResponse.json({ status: "failed" });
      }

      // Still generating
      return NextResponse.json({
        status: "generating",
        sunoStatus: sunoStatus || "PENDING",
      });
    } catch {
      return NextResponse.json({ status: "generating" });
    }
  }

  return NextResponse.json({ status: song.status });
}
