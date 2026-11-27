import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "@/lib/rate-limit";
import { isMusicStyleAvailable } from "@/lib/music-styles";
import { MAX_LYRICS_LENGTH } from "@/lib/lyrics-limits";
import { buildLyricsPrompt, LANGUAGE_NAMES, type Theme } from "@/lib/song-prompts";

const anthropic = new Anthropic();

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
  const childName = typeof body?.childName === "string" ? body.childName.trim() : "";
  const { theme, musicStyle = "gentle", language = "es", customPrompt } = body ?? {};
  if (!childName || childName.length > 100 || !["lullaby", "educational", "fun"].includes(theme)
      || !isMusicStyleAvailable(musicStyle) || typeof language !== "string" || !Object.hasOwn(LANGUAGE_NAMES, language)
      || (customPrompt != null && (typeof customPrompt !== "string" || customPrompt.length > 500))) {
    return NextResponse.json({ error: "Invalid song details" }, { status: 400 });
  }

  const prompt = buildLyricsPrompt({
    childName,
    theme: theme as Theme,
    musicStyle: musicStyle || "gentle",
    language: language || "es",
    customPrompt,
  });

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-5",
      // max_tokens covers thinking + text on claude-opus-5; 1024 left no room for lyrics
      max_tokens: 10000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const lyrics = textBlock?.type === "text" ? textBlock.text : "";

    if (!lyrics.trim() || lyrics.length > MAX_LYRICS_LENGTH) {
      return NextResponse.json({ error: "Could not generate usable lyrics. Please try again." }, { status: 502 });
    }

    // Save to database
    const { data: song, error: dbError } = await supabase
      .from("generated_songs")
      .insert({
        user_id: user.id,
        child_name: childName,
        theme,
        music_style: musicStyle,
        language,
        custom_prompt: customPrompt || null,
        lyrics,
        status: "lyrics_ready",
      })
      .select("id")
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ lyrics, songId: song.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
