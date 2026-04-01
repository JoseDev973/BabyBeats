"use client";

import { useTranslations } from "next-intl";
import SongCard from "@/components/songs/SongCard";
import type { Profile, Song } from "@/types/database";
import { User, Heart, Clock, Crown } from "lucide-react";
import { Link } from "@/i18n/routing";

interface ProfileViewProps {
  profile: Profile | null;
  email: string;
  favorites: Song[];
  history: Song[];
}

export default function ProfileView({
  profile,
  email,
  favorites,
  history,
}: ProfileViewProps) {
  const t = useTranslations("common");

  const isPremium = profile?.subscription_tier === "premium";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-8 p-6 rounded-xl border border-border bg-card">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <User className="h-8 w-8 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {profile?.display_name ?? email}
          </h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="flex items-center gap-2">
          {isPremium ? (
            <span className="flex items-center gap-1 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-medium">
              <Crown className="h-4 w-4" />
              {t("premium")}
            </span>
          ) : (
            <Link
              href="/pricing"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {t("upgrade", { plan: t("premium") })}
            </Link>
          )}
        </div>
      </div>

      {/* Favorites */}
      <section className="mb-10">
        <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
          <Heart className="h-5 w-5 text-primary" />
          {t("favorites")}
        </h2>
        {favorites.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            {t("noFavorites")}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {favorites.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                queue={favorites}
                isPremiumUser={isPremium}
              />
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
          <Clock className="h-5 w-5 text-primary" />
          {t("history")}
        </h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            {t("noHistory")}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {history.map((song, i) => (
              <SongCard
                key={`${song.id}-${i}`}
                song={song}
                queue={history}
                isPremiumUser={isPremium}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
