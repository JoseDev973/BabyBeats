import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "@/lib/rate-limit";

const anthropic = new Anthropic();

const THEME_PROMPTS = {
  lullaby:
    "Write a sweet, calming lullaby with gentle imagery (stars, moon, clouds, dreams). The song should be soothing and help a baby fall asleep.",
  educational:
    "Write a fun educational song that teaches something (colors, numbers, animals, body parts). Make it catchy and repetitive so a toddler can learn.",
  fun: "Write an upbeat, playful song for playtime. Include fun sounds, animal noises, or silly rhymes that make babies laugh.",
};

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
  const sanitizedPrompt = customPrompt
    ? customPrompt.replace(/ignore|previous|instructions|system|prompt/gi, '').slice(0, 300)
    : '';

  const languageNames: Record<string, string> = {
    es: "Spanish",
    en: "English",
    pt: "Portuguese",
    fr: "French",
    de: "German",
    it: "Italian",
  };

  const prompt = `You are a professional songwriter specializing in children's music.

${THEME_PROMPTS[theme as keyof typeof THEME_PROMPTS]}

Requirements:
- The song MUST include the child's name "${sanitizedName}" naturally in the lyrics (at least 3-4 times)
- Write in ${languageNames[language] || "Spanish"}
- Style: ${musicStyle}
- Keep it short (2-3 verses + chorus, ~1-2 minutes when sung)
- Make it age-appropriate for babies/toddlers
- Include simple, repetitive phrases that are easy to sing along
${sanitizedPrompt ? `- Additional request: ${sanitizedPrompt}` : ""}

Write ONLY the song lyrics, with clear verse/chorus structure. Use [Verse], [Chorus], [Bridge] markers.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const lyrics =
      message.content[0].type === "text" ? message.content[0].text : "";

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
