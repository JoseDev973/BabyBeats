import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "@/lib/rate-limit";
import { buildLyricsPrompt, type Theme } from "@/lib/song-prompts";

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

  const { childName, theme, musicStyle, language, customPrompt } =
    await request.json();

  if (!childName || !theme) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Sanitize inputs - strip anything that looks like prompt injection
  const sanitizedName = childName.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '').slice(0, 50);
  const prompt = buildLyricsPrompt({
    childName: sanitizedName,
    theme: (["lullaby", "educational", "fun"].includes(theme) ? theme : "lullaby") as Theme,
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
