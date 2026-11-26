/**
 * 1. Copies still-reachable Suno temp files of generated_songs / gift_songs into
 *    Supabase Storage (bucket "songs") and points the rows at the permanent URLs.
 * 2. With CATALOG=1, regenerates the 10 catalog demos (table `songs`) with the
 *    current prompts and stores them permanently. Spends Suno credits (1 gen each).
 *
 * Usage: ENV_FILE=path/.env [CATALOG=1] npx tsx scripts/fix-song-storage.ts
 */
import { readFileSync } from "node:fs";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (m) process.env[m[1]] = m[2].replace(/\\n$/, "").trim();
  }
}
if (process.env.ENV_FILE) loadEnv(process.env.ENV_FILE);

async function main() {
const { getSupabaseAdmin } = await import("../src/lib/supabase/admin");
const { persistFromUrl, extOf } = await import("../src/lib/persist-audio");
const { buildLyricsPrompt, buildSunoStyle, buildNegativeTags, SUNO_MODEL, SUNO_PARAMS } = await import(
  "../src/lib/song-prompts"
);
const { default: Anthropic } = await import("@anthropic-ai/sdk");

const db = getSupabaseAdmin();
const isTemp = (u: string | null) => !!u && !u.includes("/storage/v1/object/public/");

async function alive(url: string) {
  try {
    const r = await fetch(url, { headers: { Range: "bytes=0-10" }, signal: AbortSignal.timeout(10_000) });
    return r.ok;
  } catch {
    return false;
  }
}

async function rescue(table: "generated_songs" | "gift_songs", prefix: string) {
  const cols = table === "generated_songs" ? "id, audio_url, audio_url_b, cover_image_url" : "id, audio_url, cover_image_url";
  const { data } = await db.from(table).select(cols).not("audio_url", "is", null);
  for (const row of (data ?? []) as unknown as Record<string, string | null>[]) {
    const update: Record<string, string | null> = {};
    for (const [col, file] of [["audio_url", "a.mp3"], ["audio_url_b", "b.mp3"], ["cover_image_url", "cover"]] as const) {
      const url = row[col];
      if (!(col in row) || !isTemp(url)) continue;
      if (!(await alive(url!))) continue;
      const name = file === "cover" ? `cover.${extOf(url, "jpeg")}` : file;
      update[col] = await persistFromUrl(url, `${prefix}/${row.id}/${name}`);
    }
    if (Object.keys(update).length) {
      await db.from(table).update(update).eq("id", row.id!);
      console.log(`${table} ${row.id}: rescued ${Object.keys(update).join(", ")}`);
    }
  }
}

// ── Catalog ──
const CATALOG: Record<string, { name: string; theme: "lullaby" | "educational" | "fun"; style: string; prompt?: string }> = {
  "dulces-suenos-valentina": { name: "Valentina", theme: "lullaby", style: "gentle" },
  "goodnight-little-oliver": { name: "Oliver", theme: "lullaby", style: "acoustic" },
  "los-colores-de-mateo": { name: "Mateo", theme: "educational", style: "playful", prompt: "teach the colors" },
  "emma-counts-to-ten": { name: "Emma", theme: "educational", style: "pop", prompt: "count from one to ten" },
  "a-bailar-con-sofia": { name: "Sofía", theme: "fun", style: "reggaeton" },
  "dance-party-with-liam": { name: "Liam", theme: "fun", style: "pop" },
  "noche-estrellas-isabella": { name: "Isabella", theme: "lullaby", style: "classical" },
  "animales-de-santiago": { name: "Santiago", theme: "fun", style: "playful", prompt: "animal sounds" },
  "abcs-with-noah": { name: "Noah", theme: "educational", style: "playful", prompt: "the first letters of the alphabet" },
  "moonlight-dreams-mia": { name: "Mia", theme: "lullaby", style: "gentle" },
};

const SUNO = "https://api.sunoapi.org/api/v1";
const sunoHeaders = { Authorization: `Bearer ${process.env.SUNO_API_KEY}`, "Content-Type": "application/json" };

async function regenerate(song: { id: string; slug: string; title: string; language: string }) {
  const c = CATALOG[song.slug];
  if (!c) return console.log(`skip ${song.slug}`);
  const msg = await new Anthropic().messages.create({
    model: "claude-opus-5",
    max_tokens: 10000,
    messages: [{ role: "user", content: buildLyricsPrompt({ childName: c.name, theme: c.theme, musicStyle: c.style, language: song.language, customPrompt: c.prompt }) }],
  });
  const block = msg.content.find((b) => b.type === "text");
  const lyrics = block?.type === "text" ? block.text.trim() : "";
  if (!lyrics) throw new Error(`no lyrics for ${song.slug}`);

  const gen = await (await fetch(`${SUNO}/generate`, {
    method: "POST",
    headers: sunoHeaders,
    body: JSON.stringify({
      prompt: lyrics, customMode: true, instrumental: false, title: song.title,
      style: buildSunoStyle(c.style, c.theme, song.language), negativeTags: buildNegativeTags(c.style),
      model: SUNO_MODEL, ...SUNO_PARAMS, callBackUrl: "https://example.com/noop",
    }),
  })).json();
  if (gen.code !== 200) throw new Error(`suno ${gen.code} ${gen.msg}`);

  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 10_000));
    const rec = (await (await fetch(`${SUNO}/generate/record-info?taskId=${gen.data.taskId}`, { headers: sunoHeaders })).json()).data;
    if (rec?.status === "SUCCESS") {
      const t = rec.response.sunoData[0];
      const audio = await persistFromUrl(t.audioUrl, `catalog/${song.slug}.mp3`);
      const cover = await persistFromUrl(t.imageUrl, `catalog/${song.slug}.${extOf(t.imageUrl, "jpeg")}`);
      await db.from("songs").update({ audio_url: audio, cover_image_url: cover, lyrics, duration_seconds: Math.round(t.duration) }).eq("id", song.id);
      return console.log(`catalog ${song.slug}: ${Math.round(t.duration)}s -> ${audio}`);
    }
    if (rec?.status && /FAIL|ERROR/.test(rec.status)) throw new Error(`${song.slug} ${rec.status}`);
  }
  throw new Error(`${song.slug} timeout`);
}

await rescue("generated_songs", "generated");
await rescue("gift_songs", "gift");

if (process.env.CATALOG) {
  const { data: songs } = await db.from("songs").select("id, slug, title, language");
  const results = await Promise.allSettled((songs ?? []).map(regenerate));
  results.forEach((r) => r.status === "rejected" && console.error(r.reason));
}

}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
