"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Song } from "@/types/database";

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
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

type PlayerContextType = PlayerState & PlayerActions;

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    currentSong: null,
    queue: [],
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
  });

  useEffect(() => {
    const audio = new Audio();
    audio.volume = state.volume;
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => {
      setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
    });

    audio.addEventListener("loadedmetadata", () => {
      setState((prev) => ({ ...prev, duration: audio.duration }));
    });

    audio.addEventListener("ended", () => {
      handleNext();
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = useCallback(() => {
    setState((prev) => {
      if (prev.queue.length === 0) {
        return { ...prev, isPlaying: false };
      }
      const nextSong = prev.queue[0];
      const newQueue = prev.queue.slice(1);

      if (audioRef.current) {
        audioRef.current.src = nextSong.audio_url;
        audioRef.current.play();
      }

      return {
        ...prev,
        currentSong: nextSong,
        queue: newQueue,
        isPlaying: true,
        currentTime: 0,
      };
    });
  }, []);

  const play = useCallback((song: Song, queue?: Song[]) => {
    if (audioRef.current) {
      audioRef.current.src = song.audio_url;
      audioRef.current.play();
    }

    setState((prev) => ({
      ...prev,
      currentSong: song,
      queue: queue
        ? queue.filter((s) => s.id !== song.id)
        : prev.queue,
      isPlaying: true,
      currentTime: 0,
    }));
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !state.currentSong) return;

    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }

    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, [state.isPlaying, state.currentSong]);

  const previous = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    // No previous track history for now — restart current song
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    setState((prev) => ({ ...prev, volume }));
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setState((prev) => ({ ...prev, queue: [...prev.queue, song] }));
  }, []);

  const clearQueue = useCallback(() => {
    setState((prev) => ({ ...prev, queue: [] }));
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        play,
        togglePlay,
        next: handleNext,
        previous,
        seek,
        setVolume,
        addToQueue,
        clearQueue,
      }}
    >
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
