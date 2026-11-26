import { test, expect } from "@playwright/test";
import { mock } from "node:test";
import { generateLyrics } from "../src/lib/generate-lyrics";
import { buildLyricsPrompt, parseSongBrief, type SongBrief } from "../src/lib/song-prompts";

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
  expect(JSON.parse(buildLyricsPrompt({ ...brief, customPrompt: null }))).toHaveProperty("suggestedTopics");
});

test("sends the full family request to Claude and collects all sung text", async () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test";
  let blocks = [{ type: "text", text: "[Verse]\n小春" }, { type: "text", text: "[Outro]\nBonne nuit" }];
  let stopReason = "end_turn";
  const provider = mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    const payload = JSON.parse(String(init.body));
    expect(payload.system).toContain("baby-friendly");
    const userBrief = JSON.parse(payload.messages[0].content);
    expect(userBrief).not.toHaveProperty("suggestedTopics");
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
