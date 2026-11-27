"use client";

import { usePlayer } from "@/hooks/usePlayer";
import { useTranslations } from "next-intl";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music,
} from "lucide-react";

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function AudioPlayer() {
  const t = useTranslations("player");
  const common = useTranslations("common");
  const {
    currentSong,
    isPlaying,
    playbackError,
    queue,
    currentTime,
    duration,
    volume,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
  } = usePlayer();

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border z-50 px-4 py-2 sm:py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        {/* Song info */}
        <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial sm:w-64">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {currentSong.cover_image_url ? (
              <img
                src={currentSong.cover_image_url}
                alt={currentSong.title}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <Music className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{currentSong.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {playbackError ? <span role="alert">{t("playbackError")}</span> : isPlaying ? t("nowPlaying") : t("paused")}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-1 flex-1 max-w-md">
          <div className="flex items-center gap-3">
            <button
              aria-label={t("restart")}
              onClick={previous}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              aria-label={common(isPlaying ? "pause" : "play")}
              onClick={togglePlay}
              className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </button>
            <button
              aria-label={common("next")}
              disabled={queue.length === 0}
              onClick={next}
              className="disabled:opacity-40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Progress bar - compact on mobile, full on desktop */}
          <div className="flex items-center gap-2 w-full">
            <span className="hidden sm:inline text-xs text-muted-foreground w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              aria-label={t("position")}
              max={duration || 0}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="flex-1 h-1 accent-primary cursor-pointer"
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(duration - currentTime)}
            </span>
          </div>
        </div>

        {/* Volume (desktop only) */}
        <div className="hidden sm:flex items-center gap-2 w-32">
          <button
            aria-label={t(volume === 0 ? "unmute" : "mute")}
            onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            aria-label={t("volume")}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 h-1 accent-primary cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
