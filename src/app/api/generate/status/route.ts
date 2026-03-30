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

  if (song.status === "completed" || song.status === "failed") {
    return NextResponse.json({
      status: song.status,
      audioUrlA: song.audio_url,
      audioUrlB: song.audio_url_b,
      coverImage: song.cover_image_url,
      childName: song.child_name,
      shareToken: song.share_token,
    });
  }

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
        const tracks = data.data.response?.data;
        const trackA = tracks?.[0];
        const trackB = tracks?.[1];

        if (trackA?.audio_url) {
          await supabase
            .from("generated_songs")
            .update({
              status: "completed",
              audio_url: trackA.audio_url,
              duration_seconds: Math.round(trackA.duration || 0),
              audio_url_b: trackB?.audio_url || null,
              duration_seconds_b: trackB
                ? Math.round(trackB.duration || 0)
                : null,
              cover_image_url: trackA.image_url || trackB?.image_url || null,
              is_public: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", songId);

          return NextResponse.json({
            status: "completed",
            audioUrlA: trackA.audio_url,
            audioUrlB: trackB?.audio_url || null,
            coverImage: trackA.image_url || trackB?.image_url || null,
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
