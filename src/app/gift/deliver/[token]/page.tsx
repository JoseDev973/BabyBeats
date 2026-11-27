import { cache } from "react";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Gift, Music, Play } from "lucide-react";
import { routing } from "@/i18n/routing";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Gift as GiftType, GiftSong } from "@/types/database";

const getGift = cache(async (token: string) => {
  const { data, error } = await getSupabaseAdmin()
    .from("gifts")
    .select("id, child_name, language, delivery_mode")
    .eq("delivery_token", token)
    .in("status", ["ready", "delivered", "redeemed"])
    .maybeSingle<Pick<GiftType, "id" | "child_name" | "language" | "delivery_mode">>();
  if (error) throw new Error("Could not load gift");
  if (!data) notFound();
  return { ...data, locale: hasLocale(routing.locales, data.language) ? data.language : "en" };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const gift = await getGift(token);
  const t = await getTranslations({ locale: gift.locale, namespace: "gift" });
  const title = `${t("giftFrom")} | BabyBeats`;
  const description = t("readyDesc", { name: gift.child_name });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://babybeats.art/gift/deliver/${token}`,
      siteName: "BabyBeats",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function GiftDeliverPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const gift = await getGift(token);
  const { data: songs, error } = await getSupabaseAdmin()
    .from("gift_songs")
    .select("id, position, theme, music_style, audio_url")
    .eq("gift_id", gift.id)
    .order("position")
    .returns<Pick<GiftSong, "id" | "position" | "theme" | "music_style" | "audio_url">[]>();

  if (error) throw new Error("Could not load gift songs");
  if (gift.delivery_mode === "redeem" && songs.length === 0) {
    redirect(`/${gift.locale}/gift/redeem/${encodeURIComponent(token)}`);
  }

  const t = await getTranslations({ locale: gift.locale });

  return (
    <div lang={gift.locale} className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-gradient-to-br from-primary/20 to-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gift className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-sm font-semibold text-purple-600 mb-2">{t("gift.giftFrom")}</p>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            {gift.child_name}
          </h1>
          <p className="text-gray-500">
            {t("gift.giftMessage", { name: gift.child_name })}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {t("gift.songsCount", { count: songs.length })}
          </p>
        </div>

        {/* Song list */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {songs.map((song, i) => (
            <div
              key={song.id}
              className={`flex items-center gap-3 p-4 ${i > 0 ? "border-t border-gray-100" : ""}`}
            >
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                {song.audio_url ? (
                  <Play className="h-4 w-4 text-purple-600" />
                ) : (
                  <Music className="h-4 w-4 text-purple-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">
                  {t(`share.${song.theme}`)} #{song.position}
                </p>
                <p className="text-xs text-gray-400">{t.has(`create.${song.music_style}`) ? t(`create.${song.music_style}`) : song.music_style}</p>
              </div>
              {song.audio_url && (
                <audio controls className="w-32 h-8" src={song.audio_url} />
              )}
            </div>
          ))}

          {songs.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              {t("gift.generating")}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {t("share.createdWith")}
        </p>
      </div>
    </div>
  );
}
