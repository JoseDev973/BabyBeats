import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { settleSong } from "@/lib/settle-song";

export async function GET(request: Request) {
  const songId = new URL(request.url).searchParams.get("songId");
  if (!songId) return NextResponse.json({ error: "Missing songId" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const readSong = () => supabase.from("generated_songs")
    .select("status, suno_task_id, audio_url, audio_url_b, cover_image_url, child_name, share_token")
    .eq("id", songId).eq("user_id", user.id).maybeSingle().throwOnError();

  try {
    let { data: song } = await readSong();
    if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });
    if (song.status === "generating" && song.suno_task_id) {
      const stage = await settleSong({ kind: "song", id: songId }, song.suno_task_id);
      if (stage) return NextResponse.json({ status: "generating", sunoStatus: stage });
      // The webhook may have won the update. Return the actual committed row.
      ({ data: song } = await readSong());
      if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }
    return NextResponse.json({
      status: song.status,
      audioUrlA: song.audio_url,
      audioUrlB: song.audio_url_b,
      coverImage: song.cover_image_url,
      childName: song.child_name,
      shareToken: song.share_token,
    });
  } catch (error) {
    console.error("[Song status] Could not check song", error);
    return NextResponse.json({ error: "Status temporarily unavailable" }, { status: 503 });
  }
}
