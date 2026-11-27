import { test, expect } from "@playwright/test";
import { mock } from "node:test";
import { startSunoGeneration } from "../src/lib/suno";
import { generateLyrics } from "../src/lib/generate-lyrics";
import { buildLyricsPrompt, buildLyricsSystemPrompt, parseSongBrief, type SongBrief } from "../src/lib/song-prompts";

const familyRequest = "The solar system is our theme. ".repeat(12) + "Mention her telescope.";
const brief: SongBrief = {
  childName: "小春",
  theme: "educational",
  musicStyle: "playful",
  language: "fr",
  customPrompt: familyRequest,
};

test("validates the same brief that will be saved and used for lyrics", () => {
  expect(parseSongBrief({ ...brief, childName: " 小春 " })).toEqual(brief);
  expect(parseSongBrief({ childName: "Zoë", theme: "fun" })).toMatchObject({
    musicStyle: "gentle", language: "es", customPrompt: null,
  });
  expect(parseSongBrief({ ...brief, customPrompt: "s".repeat(501) })).toBeNull();
  expect(parseSongBrief({ ...brief, language: "unknown" })).toBeNull();
  expect(parseSongBrief({ ...brief, childName: "  " })).toBeNull();
  expect(parseSongBrief({ ...brief, childName: "小".repeat(101) })).toBeNull();
  expect(parseSongBrief({ ...brief, musicStyle: "unknown" })).toBeNull();
  const audition = { ...brief, musicStyle: "cumbia", language: "ja" };
  expect(parseSongBrief(audition, "saved")).toEqual(audition);
  expect(parseSongBrief(audition) !== null).toBe(process.env.NEXT_PUBLIC_PREVIEW_MUSIC_STYLES === "true");
  expect(JSON.parse(buildLyricsPrompt({ ...brief, customPrompt: null })).familyRequest).toBeNull();
});

test("sends the full family request to Claude and collects all sung text", async () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test";
  let blocks = [{ type: "text", text: "[Verse]\n小春" }, { type: "text", text: "[Outro]\nBonne nuit" }];
  let stopReason = "end_turn";
  const provider = mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    const payload = JSON.parse(String(init.body));
    expect(payload.system).toBe(buildLyricsSystemPrompt(brief.theme));
    const userBrief = JSON.parse(payload.messages[0].content);
    expect(userBrief).toMatchObject({
      childName: "小春", familyRequest, language: "French", musicalStyle: "playful",
    });
    return Response.json({ content: blocks, stop_reason: stopReason });
  });
  try {
    expect(await generateLyrics(brief)).toBe("[Verse]\n小春\n[Outro]\nBonne nuit");
    stopReason = "max_tokens";
    await expect(generateLyrics(brief)).rejects.toThrow("complete song");
    stopReason = "end_turn";
    blocks = [];
    await expect(generateLyrics(brief)).rejects.toThrow("complete song");
    blocks = [{ type: "text", text: "A".repeat(5001) }];
    await expect(generateLyrics(brief)).rejects.toThrow("complete song");
  } finally {
    provider.mock.restore();
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  }
});

test("keeps the listening-test composition rules for each theme", () => {
  for (const theme of ["lullaby", "educational", "fun"] as const) {
    const rules = buildLyricsSystemPrompt(theme);
    expect(rules).toContain("Structure exactly:");
    expect(rules).toContain("No other tags.");
    expect(rules).toContain("12 to 16 sung lines in total (the song should last about 1.5–2 minutes)");
    expect(rules).toContain("5 to 8 syllables per line. Chorus lines shorter than verse lines.");
    expect(rules.includes("stretch on open vowels")).toBe(theme === "lullaby");
    expect(rules.includes("whispered repeat of the name")).toBe(theme === "lullaby");
  }
});

test("submits the reviewed lyrics using the proven Suno V6 custom-mode payload", async () => {
  const opts = {
    childName: "小春", lyrics: "[Verse]\n小春 mira la luna", language: "es",
    theme: "lullaby", musicStyle: "gentle", callbackTarget: { kind: "song" as const, id: "fixture" },
  };
  const previousSecret = process.env.SUNO_WEBHOOK_SECRET;
  process.env.SUNO_WEBHOOK_SECRET = "fixture";
  const provider = mock.method(globalThis, "fetch", async (_: unknown, init: RequestInit) => {
    const payload = JSON.parse(String(init.body));
    expect(payload).toMatchObject({
      model: "V6", customMode: true, instrumental: false, prompt: opts.lyrics, duration: 110,
      styleWeight: 0.75, weirdnessConstraint: 0.25, vocalGender: "f",
    });
    expect(payload).not.toHaveProperty("lyrics");
    return Response.json({ code: 200, data: { taskId: "fixture" } });
  });
  try {
    expect(await startSunoGeneration(opts)).toBe("fixture");
  } finally {
    provider.mock.restore();
    if (previousSecret === undefined) delete process.env.SUNO_WEBHOOK_SECRET;
    else process.env.SUNO_WEBHOOK_SECRET = previousSecret;
  }
});
