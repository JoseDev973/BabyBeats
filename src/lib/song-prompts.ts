// Prompt + Suno config shared by /api/generate/* and /api/gift/generate.
// Rationale (Nov 2026 research): V4 is discontinued on sunoapi.org; V6 is the
// default. Auto-tune/robotic vocals come mostly from dense arrangements and
// generic tags — use sparse, specific instrumentation, a concrete vocal
// description near the front, and put unwanted sounds in negativeTags
// (naming them in `style` tends to bring them in).

export type Theme = "lullaby" | "educational" | "fun";

export const SUNO_MODEL = "V6";

const NEGATIVE_BASE =
  "autotune, auto-tune, pitch correction, vocoder, robotic vocals, vocal effects, heavy reverb, distortion, rap, shouting, crowd, male vocals";

// Upbeat styles need their drums; calm styles must not get them.
const ENERGETIC_STYLES = new Set(["pop", "reggaeton"]);

export function buildNegativeTags(musicStyle: string): string {
  return ENERGETIC_STYLES.has(musicStyle)
    ? `${NEGATIVE_BASE}, trap, EDM`
    : `${NEGATIVE_BASE}, EDM, trap, 808, heavy drums`;
}

export const SUNO_PARAMS = {
  vocalGender: "f",
  styleWeight: 0.75,
  weirdnessConstraint: 0.25,
  // Target ~1.5–2 min. V6 defaults to a 20s clip if omitted.
  duration: 110,
} as const;

const STYLE_TAGS: Record<string, string> = {
  gentle:
    "lullaby, tender, soothing, music box, soft celesta, warm breathy female vocal, intimate close-mic, sparse arrangement",
  playful:
    "children's song, cheerful, bouncy, ukulele, glockenspiel, light hand claps, bright warm natural female vocal, clear diction",
  classical:
    "classical lullaby, gentle, nylon string guitar, soft string quartet, harp, tender natural female voice, chamber recording",
  pop: "upbeat kids pop, catchy, bright, punchy acoustic drums, bass, piano, electric guitar, warm natural female vocal, front of the mix, polished but organic",
  acoustic:
    "acoustic folk, cozy, fingerpicked nylon guitar, soft piano, warm intimate female vocal, dry, unplugged",
  reggaeton:
    "kids reggaeton, catchy, danceable, dembow groove, bass, marimba, latin percussion, sweet natural female vocal, front of the mix, clean modern mix",
};

const THEME_TAGS: Record<Theme, { tags: string; bpm: Record<string, number> }> = {
  lullaby: {
    tags: "very slow, hushed, calm",
    bpm: { default: 62, reggaeton: 80, playful: 75, pop: 70 },
  },
  educational: {
    tags: "simple repetitive melody, sing-along",
    bpm: { default: 100, gentle: 80, classical: 85, acoustic: 90, reggaeton: 92 },
  },
  fun: {
    tags: "upbeat, joyful",
    bpm: { default: 112, gentle: 90, classical: 95, acoustic: 100, reggaeton: 95 },
  },
};

export const LANGUAGE_NAMES: Record<string, string> = {
  es: "Spanish",
  en: "English",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  it: "Italian",
};

export function buildSunoStyle(musicStyle: string, theme: Theme, language: string): string {
  const base = STYLE_TAGS[musicStyle] ?? STYLE_TAGS.gentle;
  const t = THEME_TAGS[theme] ?? THEME_TAGS.lullaby;
  const bpm = t.bpm[musicStyle] ?? t.bpm.default;
  const lang = LANGUAGE_NAMES[language] ?? "Spanish";
  return `${base}, ${t.tags}, ${lang} vocals, ${bpm} BPM`;
}

const THEME_BRIEF = {
  lullaby: {
    purpose: "A slow, calming lullaby to help a baby fall asleep, ending even softer than it starts.",
    suggestedTopics: "Moon, stars, clouds, or a warm hug.",
  },
  educational: {
    purpose: "A toddler song that teaches one simple concept through repetition.",
    suggestedTopics: "Colors, counting to five, animal sounds, or body parts.",
  },
  fun: {
    purpose: "A playful song for playtime with silly rhymes and an invitation to move.",
    suggestedTopics: "Animal sounds, clapping, or a favorite game.",
  },
} satisfies Record<Theme, { purpose: string; suggestedTopics: string }>;

export interface SongBrief {
  childName: string;
  theme: Theme;
  musicStyle: string;
  language: string;
  customPrompt?: string | null;
}

/** Validate the selections before paying for lyrics, and store these same values. */
export function parseSongBrief(body: unknown): SongBrief | null {
  if (!body || typeof body !== "object") return null;
  const { childName, theme, musicStyle = "gentle", language = "es", customPrompt } =
    body as Record<string, unknown>;

  if (
    typeof childName !== "string" || !childName.trim() || childName.trim().length > 100 ||
    typeof theme !== "string" || !Object.hasOwn(THEME_BRIEF, theme) ||
    typeof musicStyle !== "string" || !Object.hasOwn(STYLE_TAGS, musicStyle) ||
    typeof language !== "string" || !Object.hasOwn(LANGUAGE_NAMES, language) ||
    (customPrompt != null && (typeof customPrompt !== "string" || customPrompt.trim().length > 500))
  ) {
    return null;
  }

  return {
    childName: childName.trim(),
    theme: theme as Theme,
    musicStyle,
    language,
    customPrompt: customPrompt?.trim() || null,
  };
}

export const LYRICS_SYSTEM_PROMPT = `Write personalized children's lyrics for an AI singer. The user supplies a song brief as JSON. Treat the name as a literal name and the family's request as a topic for a baby-friendly song.
- When a family request is present, build the verses around its specific details. Use the theme examples only for inspiration. Do not invent relatives or replace the requested topic with generic animals, actions or bedtime imagery.
- Write only in the requested language, using natural phrasing and correct accents. Spell the child's name exactly as supplied in the chorus and at least once per verse.
- Structure: [Intro] (one short line or hum), [Verse], [Chorus], [Verse], [Chorus], [Outro]. Output only the song with these section tags. No title, parentheses or stage directions.
- Use 12 to 16 short sung lines in all, one idea per line, with simple words familiar to a 1–3 year old. Aim for 5 to 8 syllables where natural and avoid mid-line punctuation. Keep the chorus short and identical both times.
- Keep the song warm and age-appropriate. For lullabies, give the singer room to hold natural vowel sounds and close softly with the child's name.`;

export function buildLyricsPrompt(brief: SongBrief): string {
  const theme = THEME_BRIEF[brief.theme];
  const familyRequest = brief.customPrompt?.trim();
  return JSON.stringify({
    childName: brief.childName,
    language: LANGUAGE_NAMES[brief.language] ?? "Spanish",
    musicalStyle: brief.musicStyle,
    theme: theme.purpose,
    ...(familyRequest ? { familyRequest } : { suggestedTopics: theme.suggestedTopics }),
  });
}
