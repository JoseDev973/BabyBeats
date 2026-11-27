export type PlaybackState = "paused" | "loading" | "playing" | "error";

export function readPlaybackState(audio: HTMLAudioElement): PlaybackState {
  if (audio.error) return "error";
  if (audio.paused || audio.ended) return "paused";
  return audio.readyState < audio.HAVE_FUTURE_DATA ? "loading" : "playing";
}

export function canPausePlayback(state: PlaybackState) {
  return state === "loading" || state === "playing";
}
