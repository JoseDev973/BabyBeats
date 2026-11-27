import Anthropic from "@anthropic-ai/sdk";
import { buildLyricsPrompt, buildLyricsSystemPrompt, type SongBrief } from "@/lib/song-prompts";
import { MAX_LYRICS_LENGTH } from "@/lib/lyrics-limits";

export async function generateLyrics(brief: SongBrief): Promise<string> {
  const message = await new Anthropic().messages.create({
    model: "claude-opus-5",
    // This budget includes thinking tokens as well as the sung text.
    max_tokens: 10000,
    system: buildLyricsSystemPrompt(brief.theme),
    messages: [{ role: "user", content: buildLyricsPrompt(brief) }],
  });

  const lyrics = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (message.stop_reason !== "end_turn" || !lyrics || lyrics.length > MAX_LYRICS_LENGTH) {
    throw new Error("Lyrics generation did not return a complete song. Please try again.");
  }
  return lyrics;
}
