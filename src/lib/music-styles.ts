const STANDARD_STYLES = ["gentle", "playful", "classical", "pop", "acoustic", "reggaeton"];
const PREVIEW_STYLES = ["bossaNova", "cumbia", "jazz", "folk", "salsa", "waltz"];

// Opt in on an audition build. Existing drafts keep their original sound when the flag changes.
export const AVAILABLE_MUSIC_STYLES = process.env.NEXT_PUBLIC_PREVIEW_MUSIC_STYLES === "true"
  ? [...STANDARD_STYLES, ...PREVIEW_STYLES]
  : STANDARD_STYLES;

export function isMusicStyleAvailable(style: string): boolean {
  return AVAILABLE_MUSIC_STYLES.includes(style);
}
