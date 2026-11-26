/**
 * A/B test: current (old) prompts vs new prompts (src/lib/song-prompts.ts).
 * Usage: ENV_FILE=path/to/.env npx tsx scripts/ab-suno.ts [outDir]
 * Needs ANTHROPIC_API_KEY and SUNO_API_KEY. Spends Suno credits (2 gens per case).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import {
  SUNO_MODEL,
  buildNegativeTags,
  SUNO_PARAMS,
  buildLyricsPrompt,
  LYRICS_SYSTEM_PROMPT,
  buildSunoStyle,
  type Theme,
} from "../src/lib/song-prompts";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (m) process.env[m[1]] = m[2].replace(/\\n$/, "").trim();
  }
}
if (process.env.ENV_FILE) loadEnv(process.env.ENV_FILE);

const SUNO = "https://api.sunoapi.org/api/v1";
const OUT = process.argv[2] ?? "ab-out";
const CHILD = process.env.CHILD ?? "Sofía";
const LANG = process.env.LANG_CODE ?? "es";
// VARIANTS=new to skip the old prompts
const VARIANTS = (process.env.VARIANTS ?? "old,new").split(",") as ("old" | "new")[];

const ALL_CASES: { style: string; theme: Theme }[] = [
  { style: "gentle", theme: "lullaby" },
  { style: "acoustic", theme: "lullaby" },
  { style: "classical", theme: "lullaby" },
  { style: "playful", theme: "fun" },
  { style: "pop", theme: "educational" },
  { style: "reggaeton", theme: "fun" },
];
// ONLY=pop,reggaeton to test a subset
const CASES = process.env.ONLY
  ? ALL_CASES.filter((c) => process.env.ONLY!.split(",").includes(c.style))
  : ALL_CASES;

// ── Old prompts, copied from production as of 5a2a0ef ──
const OLD_THEME: Record<Theme, string> = {
  lullaby:
    "Write a sweet, calming lullaby with gentle imagery (stars, moon, clouds, dreams). The song should be soothing and help a baby fall asleep.",
  educational:
    "Write a fun educational song that teaches something (colors, numbers, animals, body parts). Make it catchy and repetitive so a toddler can learn.",
  fun: "Write an upbeat, playful song for playtime. Include fun sounds, animal noises, or silly rhymes that make babies laugh.",
};
const OLD_STYLE: Record<string, string> = {
  gentle: "gentle, soft, sweet lullaby, baby music, toddler song, nursery, soothing for infants",
  playful: "playful, upbeat, happy, baby music, toddler song, nursery, fun for kids",
  classical: "classical, orchestral, baby music, toddler song, nursery, soothing for infants",
  pop: "pop, catchy, baby music, toddler song, nursery, fun for kids",
  acoustic: "acoustic, folk, warm, baby music, toddler song, nursery, soothing for infants",
  reggaeton: "reggaeton, latin, baby music, toddler song, nursery, fun for kids",
};
function oldLyricsPrompt(theme: Theme, style: string) {
  return `You are a professional songwriter specializing in children's music.

${OLD_THEME[theme]}

Requirements:
- The song MUST include the child's name "${CHILD}" naturally in the lyrics (at least 3-4 times)
- Write in Spanish
- Style: ${style}
- Keep it short (2-3 verses + chorus, ~1-2 minutes when sung)
- Make it age-appropriate for babies/toddlers
- Include simple, repetitive phrases that are easy to sing along

Write ONLY the song lyrics, with clear verse/chorus structure. Use [Verse], [Chorus], [Bridge] markers.`;
}

const anthropic = new Anthropic();

async function lyrics(prompt: string, system?: string) {
  const msg = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 10000,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text.trim() : "";
}

async function suno(body: Record<string, unknown>) {
  const res = await fetch(`${SUNO}/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUNO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, customMode: true, instrumental: false, callBackUrl: "https://example.com/noop" }),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(`Suno: ${json.code} ${json.msg}`);
  return json.data.taskId as string;
}

async function waitFor(taskId: string) {
  for (let i = 0; i < 90; i++) {
    const res = await fetch(`${SUNO}/generate/record-info?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${process.env.SUNO_API_KEY}` },
    });
    const json = await res.json();
    const d = json.data;
    if (d?.status === "SUCCESS") return d;
    if (d?.status && /FAIL|ERROR/.test(d.status)) throw new Error(`Suno task ${d.status}: ${d.errorMessage}`);
    await new Promise((r) => setTimeout(r, 10_000));
  }
  throw new Error("timeout");
}

async function runVariant(variant: "old" | "new", c: (typeof CASES)[number]) {
  const prompt =
    variant === "old"
      ? oldLyricsPrompt(c.theme, c.style)
      : buildLyricsPrompt({ childName: CHILD, theme: c.theme, musicStyle: c.style, language: LANG });
  const text = await lyrics(prompt, variant === "new" ? LYRICS_SYSTEM_PROMPT : undefined);
  const tags = variant === "old" ? OLD_STYLE[c.style] : buildSunoStyle(c.style, c.theme, LANG);
  const body =
    variant === "old"
      ? { prompt: text, style: tags, title: `${CHILD}'s Song`, model: "V4" }
      : {
          lyrics: text,
          style: tags,
          title: `${LANG === "en" ? "A song for" : "Canción para"} ${CHILD}`,
          model: SUNO_MODEL,
          negativeTags: buildNegativeTags(c.style),
          ...SUNO_PARAMS,
        };
  const taskId = await suno(body);
  const record = await waitFor(taskId);
  const tracks = (record.response?.sunoData ?? []).map((t: Record<string, unknown>) => ({
    audioUrl: t.audioUrl ?? t.sourceAudioUrl,
    duration: t.duration,
    modelName: t.modelName,
  }));
  return { variant, ...c, tags, lyrics: text, taskId, tracks };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const jobs = CASES.flatMap((c) => VARIANTS.map((v) => ({ v, c })));
  const results = await Promise.allSettled(jobs.map(({ v, c }) => runVariant(v, c)));
  const out = results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { variant: jobs[i].v, ...jobs[i].c, error: String(r.reason) },
  );
  writeFileSync(`${OUT}/results.json`, JSON.stringify(out, null, 2));
  for (const r of out) {
    const tracks = "tracks" in r ? r.tracks : [];
    console.log(r.variant, r.style, r.theme, "error" in r ? r.error : tracks.map((t: { duration: unknown; modelName: unknown }) => `${t.duration}s ${t.modelName}`).join(" | "));
  }
}

main();
