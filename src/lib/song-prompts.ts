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

// Keep the percussion specified by each arrangement available to the singer.
const STYLES_WITH_PERCUSSION = new Set(["pop", "reggaeton", "salsa", "cumbia", "jazz", "bossaNova"]);

export function buildNegativeTags(musicStyle: string): string {
  return STYLES_WITH_PERCUSSION.has(musicStyle)
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
  bossaNova: "acoustic bossa nova, syncopated nylon guitar, shaker, warm natural female voice",
  cumbia: "Colombian cumbia, accordion, guacharaca, hand drums, melodic natural female vocal",
  jazz: "children's acoustic jazz, upright bass, brushed drums, soft piano, clear female vocal",
  folk: "acoustic folk song, mandolin, fingerpicked guitar, natural storytelling female vocal",
  salsa: "kids salsa, piano montuno, congas, claves, clear melodic female vocal",
  waltz: "gentle waltz in three four, piano, soft strings, warm natural female vocal",
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
  nl: "Dutch",
  sv: "Swedish",
  ja: "Japanese",
  ko: "Korean",
  hi: "Hindi",
  ar: "Arabic",
};

export function buildSunoStyle(musicStyle: string, theme: Theme, language: string): string {
  const base = STYLE_TAGS[musicStyle] ?? STYLE_TAGS.gentle;
  const t = THEME_TAGS[theme] ?? THEME_TAGS.lullaby;
  const bpm = t.bpm[musicStyle] ?? t.bpm.default;
  const lang = LANGUAGE_NAMES[language] ?? "Spanish";
  return `${base}, ${t.tags}, ${lang} vocals, ${bpm} BPM`;
}

const THEME_BRIEF: Record<Theme, string> = {
  lullaby:
    "A lullaby to help a baby fall asleep: soft imagery (moon, stars, clouds, a warm hug, mom's/dad's arms), slow and calming, ending even softer than it starts.",
  educational:
    "A fun learning song for a toddler that teaches ONE simple concept (e.g. colors, counting to five, animal sounds, body parts). Repetition is the teaching tool.",
  fun: "A playful song for playtime: silly rhymes, a few animal sounds or onomatopoeia, an invitation to clap or move.",
};

export function buildLyricsPrompt(opts: {
  childName: string;
  theme: Theme;
  musicStyle: string;
  language: string;
  customPrompt?: string | null;
}): string {
  const lang = LANGUAGE_NAMES[opts.language] ?? "Spanish";
  const custom = opts.customPrompt
    ? opts.customPrompt.replace(/ignore|previous|instructions|system|prompt/gi, "").slice(0, 300)
    : "";

  return `You write lyrics for personalized children's songs that will be sung by an AI singer (Suno). Lyrics that are easy to sing make the voice sound natural; dense or wordy lyrics make it sound rushed and robotic.

Song brief: ${THEME_BRIEF[opts.theme]}
Musical style: ${opts.musicStyle}
Language: ${lang} only — natural, native phrasing with correct accents; no words from other languages (e.g. don't use "baby" in Spanish).
Child's name: "${opts.childName}" — spell it exactly like this every time. Use it in the chorus and at least once per verse.
${custom ? `Parent's special request (honor it if appropriate for a baby): ${custom}\n` : ""}
Rules:
- Structure exactly: [Intro] (one short line or a hum like "Mmm..."), [Verse], [Chorus], [Verse], [Chorus], [Outro]. No other tags.
- 12 to 16 sung lines in total (the song should last about 1.5–2 minutes).
- 5 to 8 syllables per line. Chorus lines shorter than verse lines. One idea per line.
- The chorus is identical both times and is the catchiest, simplest part.
- Simple words a 1–3 year old hears every day. Warm, loving, never scary or sad.
${opts.theme === "lullaby" ? "- Let some line endings stretch on open vowels (e.g. \"duermeee\", \"sleeeep\") and make the [Outro] a whispered repeat of the name.\n" : ""}- No punctuation in the middle of lines, no parentheses, no stage directions, no title.

Output ONLY the lyrics with the section tags.`;
}
