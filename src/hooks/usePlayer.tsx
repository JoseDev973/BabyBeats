"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { canPausePlayback, readPlaybackState, type PlaybackState } from "@/lib/playback-state";
import type { Song } from "@/types/database";

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  playback: PlaybackState;
  currentTime: number;
  duration: number;
  volume: number;
}

interface PlayerActions {
  play: (song: Song, queue?: Song[]) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  addToQueue: (song: Song) => void;
  clearQueue: () => void;
}

type PlayerContextType = PlayerState & PlayerActions & { canPause: boolean };

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    currentSong: null,
    queue: [],
    playback: "paused",
    currentTime: 0,
    duration: 0,
    volume: 0.8,
  });

  // The catalog, landing demos and native song controls share one playback session.
  useEffect(() => {
    let active: HTMLAudioElement | null = null;
    function onPlay(event: Event) {
      const audio = event.target;
      if (!(audio instanceof HTMLAudioElement) || audio.paused) return;
      if (active !== audio) active?.pause();
      active = audio;
    }
    document.addEventListener("play", onPlay, true);
    return () => {
      document.removeEventListener("play", onPlay, true);
      active?.pause();
    };
  }, []);

  async function startAudio(audio: HTMLAudioElement) {
    const source = audio.src;
    try {
      await audio.play();
    } catch (error) {
      // Selecting another song or pausing while it loads aborts the old request.
      if (audio.src !== source || (error instanceof DOMException && error.name === "AbortError")) return;
      setState((prev) => ({ ...prev, playback: "error" }));
    }
  }

  function playTrack(song: Song, remaining: Song[]) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = song.audio_url;
    audio.volume = state.volume;
    setState((prev) => ({
      ...prev,
      currentSong: song,
      queue: remaining,
      playback: "loading",
      currentTime: 0,
      duration: 0,
    }));
    void startAudio(audio);
  }

  function play(song: Song, queue?: Song[]) {
    const remaining = queue
      ? queue.slice(queue.findIndex((track) => track.id === song.id) + 1)
      : state.queue;
    playTrack(song, remaining);
  }

  function next() {
    const [song, ...remaining] = state.queue;
    if (song) playTrack(song, remaining);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !state.currentSong) return;
    if (!audio.paused) {
      audio.pause();
    } else {
      if (audio.error) audio.load();
      void startAudio(audio);
    }
  }

  function seek(time: number) {
    if (audioRef.current) audioRef.current.currentTime = time;
  }

  function setVolume(volume: number) {
    if (audioRef.current) audioRef.current.volume = volume;
    setState((prev) => ({ ...prev, volume }));
  }

  function syncPlayback(event: SyntheticEvent<HTMLAudioElement>) {
    const playback = readPlaybackState(event.currentTarget);
    setState((prev) => ({ ...prev, playback }));
  }

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        canPause: canPausePlayback(state.playback),
        play,
        togglePlay,
        next,
        previous: () => seek(0),
        seek,
        setVolume,
        addToQueue: (song) => setState((prev) => ({ ...prev, queue: [...prev.queue, song] })),
        clearQueue: () => setState((prev) => ({ ...prev, queue: [] })),
      }}
    >
      <audio
        ref={audioRef}
        onPlay={syncPlayback}
        onPlaying={syncPlayback}
        onWaiting={syncPlayback}
        onPause={syncPlayback}
        onError={syncPlayback}
        onTimeUpdate={({ currentTarget }) => {
          const currentTime = currentTarget.currentTime;
          setState((prev) => ({ ...prev, currentTime }));
        }}
        onDurationChange={({ currentTarget }) => {
          const duration = Number.isFinite(currentTarget.duration) ? currentTarget.duration : 0;
          setState((prev) => ({ ...prev, duration }));
        }}
        onEnded={next}
      />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
