"use client";

import { useTranslations } from "next-intl";
import { usePlayer } from "@/hooks/usePlayer";
import type { Song } from "@/types/database";
import { Play, Pause, Lock, Music } from "lucide-react";

interface SongCardProps {
  song: Song;
  queue?: Song[];
  isPremiumUser?: boolean;
}

export default function SongCard({
  song,
  queue,
  isPremiumUser = false,
}: SongCardProps) {
  const t = useTranslations("songs");
  const { currentSong, isPlaying, play, togglePlay } = usePlayer();

  const isCurrentSong = currentSong?.id === song.id;
  const isLocked = song.is_premium && !isPremiumUser;

  function handlePlay() {
    if (isLocked) return;
    if (isCurrentSong) {
      togglePlay();
    } else {
      play(song, queue);
    }
  }

  return (
    <div
      className={`group relative flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:shadow-md transition-all cursor-pointer ${
        isCurrentSong ? "border-primary bg-primary/5" : ""
      } ${isLocked ? "opacity-75" : ""}`}
      onClick={handlePlay}
    >
      {/* Cover art */}
      <div className="relative h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
        {song.cover_image_url ? (
          <img
            src={song.cover_image_url}
            alt={song.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <Music className="h-5 w-5 text-primary" />
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isLocked ? (
            <Lock className="h-4 w-4 text-white" />
          ) : isCurrentSong && isPlaying ? (
            <Pause className="h-4 w-4 text-white" />
          ) : (
            <Play className="h-4 w-4 text-white ml-0.5" />
          )}
        </div>
      </div>

      {/* Song info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{song.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {song.category?.name} &middot; {song.language.toUpperCase()}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 shrink-0">
        {song.is_premium && (
          <span className="text-xs font-medium bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
            {t("premiumBadge")}
          </span>
        )}
        {song.duration_seconds && (
          <span className="text-xs text-muted-foreground">
            {Math.floor(song.duration_seconds / 60)}:
            {(song.duration_seconds % 60).toString().padStart(2, "0")}
          </span>
        )}
      </div>
    </div>
  );
}
