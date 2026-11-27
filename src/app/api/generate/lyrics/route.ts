import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLyrics } from "@/lib/generate-lyrics";
import { rateLimit } from "@/lib/rate-limit";
import { parseSongBrief } from "@/lib/song-prompts";

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

  const brief = parseSongBrief(await request.json().catch(() => null));
  if (!brief) {
    return NextResponse.json({ error: "Invalid song details" }, { status: 400 });
  }

  let lyrics: string;
  try {
    lyrics = await generateLyrics(brief);
  } catch (error) {
    console.error("[Lyrics] Generation failed", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json({ error: "Could not generate lyrics. Please try again." }, { status: 502 });
  }

  const { data: song, error: dbError } = await supabase
    .from("generated_songs")
    .insert({
      user_id: user.id,
      child_name: brief.childName,
      theme: brief.theme,
      music_style: brief.musicStyle,
      language: brief.language,
      custom_prompt: brief.customPrompt,
      lyrics,
      status: "lyrics_ready",
    })
    .select("id")
    .single();

  if (dbError) {
    return NextResponse.json({ error: "Could not save the lyrics." }, { status: 500 });
  }

  return NextResponse.json({ lyrics, songId: song.id });
}
