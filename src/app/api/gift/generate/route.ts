import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/utils";
import type { GiftSong, SongTheme } from "@/types/database";

const SUNO_API_BASE = "https://api.sunoapi.org/api/v1";

const THEME_PROMPTS: Record<SongTheme, string> = {
  lullaby:
    "Write a sweet, calming lullaby with gentle imagery (stars, moon, clouds, dreams). The song should be soothing and help a baby fall asleep.",
  educational:
    "Write a fun educational song that teaches something (colors, numbers, animals, body parts). Make it catchy and repetitive so a toddler can learn.",
  fun: "Write an upbeat, playful song for playtime. Include fun sounds, animal noises, or silly rhymes that make babies laugh.",
};

const STYLE_MAP: Record<string, string> = {
  gentle:
    "gentle, soft, sweet lullaby, baby music, toddler song, nursery, soothing for infants",
  playful:
    "playful, upbeat, happy, baby music, toddler song, nursery, fun for kids",
  classical:
    "classical, orchestral, baby music, toddler song, nursery, soothing for infants",
  pop: "pop, catchy, baby music, toddler song, nursery, fun for kids",
  acoustic:
    "acoustic, folk, warm, baby music, toddler song, nursery, soothing for infants",
  reggaeton:
    "reggaeton, latin, baby music, toddler song, nursery, fun for kids",
};

const LANGUAGE_NAMES: Record<string, string> = {
  es: "Spanish",
  en: "English",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  it: "Italian",
};

function getAnthropic() {
  const { default: Anthropic } = require("@anthropic-ai/sdk") as {
    default: new () => import("@anthropic-ai/sdk").default;
  };
  return new Anthropic();
}

async function generateLyrics(
  childName: string,
  theme: SongTheme,
  musicStyle: string,
  language: string,
  customPrompt: string | null,
): Promise<string> {
  const anthropic = getAnthropic();

  // Sanitize inputs - strip anything that looks like prompt injection
  const sanitizedName = childName.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '').slice(0, 50);
  const sanitizedPrompt = customPrompt
    ? customPrompt.replace(/ignore|previous|instructions|system|prompt/gi, '').slice(0, 300)
    : '';

  const prompt = `You are a professional songwriter specializing in children's music.

${THEME_PROMPTS[theme]}

Requirements:
- The song MUST include the child's name "${sanitizedName}" naturally in the lyrics (at least 3-4 times)
- Write in ${LANGUAGE_NAMES[language] || "Spanish"}
- Style: ${musicStyle}
- Keep it short (2-3 verses + chorus, ~1-2 minutes when sung)
- Make it age-appropriate for babies/toddlers
- Include simple, repetitive phrases that are easy to sing along
${sanitizedPrompt ? `- Additional request: ${sanitizedPrompt}` : ""}

Write ONLY the song lyrics, with clear verse/chorus structure. Use [Verse], [Chorus], [Bridge] markers.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}

async function startSunoGeneration(
  lyrics: string,
  musicStyle: string,
  childName: string,
): Promise<string> {
  const style =
    STYLE_MAP[musicStyle] ||
    "baby music, toddler song, nursery, soothing for infants";

  const res = await fetch(`${SUNO_API_BASE}/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUNO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: lyrics,
      customMode: true,
      style,
      title: `${childName}'s Song`,
      instrumental: false,
      model: "V4",
      callBackUrl: `${getAppUrl()}/api/webhooks/suno`,
    }),
  });

  const result = await res.json();

  if (result.code !== 200 || !result.data?.taskId) {
    throw new Error(result.msg || "Failed to start Suno generation");
  }

  return result.data.taskId;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { giftId } = await request.json();

  if (!giftId) {
    return NextResponse.json(
      { error: "Missing required field: giftId" },
      { status: 400 },
    );
  }

  // Verify gift ownership
  const { data: gift, error: giftError } = await supabase
    .from("gifts")
    .select("*")
    .eq("id", giftId)
    .eq("buyer_id", user.id)
    .single();

  if (giftError || !gift) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }

  if (gift.status === "generating" || gift.status === "ready") {
    return NextResponse.json(
      { error: "GIFT_ALREADY_PROCESSING" },
      { status: 400 },
    );
  }

  // Fetch all gift songs
  const { data: giftSongs, error: songsError } = await supabase
    .from("gift_songs")
    .select("*")
    .eq("gift_id", giftId)
    .order("position");

  if (songsError || !giftSongs || giftSongs.length === 0) {
    return NextResponse.json(
      { error: "No songs found for this gift" },
      { status: 404 },
    );
  }

  const songs = giftSongs as GiftSong[];

  try {
    // Process each gift song: generate lyrics then start audio generation
    for (const song of songs) {
      // Generate lyrics via Claude
      const lyrics = await generateLyrics(
        gift.child_name,
        song.theme as SongTheme,
        song.music_style,
        song.language || gift.language || "es",
        song.custom_prompt,
      );

      // Update gift_song with lyrics
      await supabase
        .from("gift_songs")
        .update({ lyrics })
        .eq("id", song.id);

      // Start Suno audio generation
      const taskId = await startSunoGeneration(
        lyrics,
        song.music_style,
        gift.child_name,
      );

      // Update gift_song with task ID and status
      await supabase
        .from("gift_songs")
        .update({
          suno_task_id: taskId,
          status: "generating",
        })
        .eq("id", song.id);
    }

    // Update gift status to generating
    await supabase
      .from("gifts")
      .update({
        status: "generating",
        updated_at: new Date().toISOString(),
      })
      .eq("id", giftId);

    return NextResponse.json({
      giftId,
      status: "generating",
      totalSongs: songs.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gift generation failed";
    console.error("[Gift Generate] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
