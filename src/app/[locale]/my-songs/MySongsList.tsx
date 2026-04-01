"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import type { GeneratedSong } from "@/types/database";
import {
  Music,
  Download,
  Share2,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Coins,
  Baby,
} from "lucide-react";

interface MySongsListProps {
  songs: GeneratedSong[];
  credits: number;
}

const STATUS_ICONS = {
  draft: Clock,
  lyrics_ready: Clock,
  generating: Loader2,
  completed: CheckCircle2,
  failed: AlertCircle,
};

const STATUS_COLORS = {
  draft: "text-muted-foreground",
  lyrics_ready: "text-yellow-500",
  generating: "text-blue-500 animate-spin",
  completed: "text-green-500",
  failed: "text-destructive",
};

export default function MySongsList({ songs, credits }: MySongsListProps) {
  const t = useTranslations("mySongs");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyShareLink(song: GeneratedSong) {
    const url = `${window.location.origin}/share/${song.share_token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(song.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Coins className="h-4 w-4" />
            {t("creditsRemaining", { credits })}
          </p>
        </div>
        <Link
          href="/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("createSong")}
        </Link>
      </div>

      {songs.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <Baby className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-medium mb-2">{t("noSongsYet")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("createFirstPrompt")}
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("createFirstSong")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {songs.map((song) => {
            const StatusIcon = STATUS_ICONS[song.status];
            return (
              <div
                key={song.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Music className="h-5 w-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {t("songFor", { name: song.child_name })}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{t(song.theme)}</span>
                    <span>&middot;</span>
                    <span>{song.language.toUpperCase()}</span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1">
                      <StatusIcon
                        className={`h-3 w-3 ${STATUS_COLORS[song.status]}`}
                      />
                      {t(`status.${song.status}`)}
                    </span>
                  </p>
                </div>

                {song.status === "completed" && (
                  <div className="flex items-center gap-2 shrink-0">
                    {song.audio_url && (
                      <a
                        href={song.audio_url}
                        download={`${song.child_name}-babybeats.mp3`}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="Download MP3"
                      >
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                    <button
                      onClick={() => copyShareLink(song)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      title="Copy share link"
                    >
                      {copiedId === song.id ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Share2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
