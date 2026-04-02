import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { Music, Gift, Play } from "lucide-react";
import type { Gift as GiftType, GiftSong } from "@/types/database";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const LABELS = {
  en: {
    giftFrom: "A gift for you",
    giftMessage: (name: string) => `Someone special created a personalized music album for ${name}`,
    songs: "songs",
    listenNow: "Listen now",
    createdWith: "Created with BabyBeats",
    lullaby: "Lullaby",
    educational: "Educational",
    fun: "Fun & Play",
  },
  es: {
    giftFrom: "Un regalo para ti",
    giftMessage: (name: string) => `Alguien especial cre\u00f3 un \u00e1lbum de m\u00fasica personalizado para ${name}`,
    songs: "canciones",
    listenNow: "Escuchar ahora",
    createdWith: "Creado con BabyBeats",
    lullaby: "Canci\u00f3n de cuna",
    educational: "Educativa",
    fun: "Diversi\u00f3n",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = getSupabase();
  const { data: gift } = await supabase
    .from("gifts")
    .select("child_name")
    .eq("delivery_token", token)
    .single();

  if (!gift) return { title: "Gift not found" };

  const title = `Album for ${gift.child_name} | BabyBeats`;
  const description = `A personalized music album created for ${gift.child_name}`;

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

  const supabase = getSupabase();
  const { data: gift } = await supabase
    .from("gifts")
    .select("*")
    .eq("delivery_token", token)
    .in("status", ["ready", "delivered", "redeemed"])
    .single();

  if (!gift) notFound();

  const g = gift as GiftType;
  const safeName = g.child_name.replace(/[<>"'&]/g, '');
  const lang = (g.language === "es" ? "es" : "en") as keyof typeof LABELS;
  const l = LABELS[lang];

  const { data: songs } = await supabase
    .from("gift_songs")
    .select("*")
    .eq("gift_id", g.id)
    .order("position");

  const giftSongs = (songs as GiftSong[]) || [];

  const THEME_LABELS = { lullaby: l.lullaby, educational: l.educational, fun: l.fun };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-gradient-to-br from-primary/20 to-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gift className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-sm font-semibold text-purple-600 mb-2">{l.giftFrom}</p>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            {safeName}
          </h1>
          <p className="text-gray-500">
            {l.giftMessage(safeName)}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {giftSongs.length} {l.songs}
          </p>
        </div>

        {/* Song list */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {giftSongs.map((song, i) => (
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
                  {THEME_LABELS[song.theme]} #{song.position}
                </p>
                <p className="text-xs text-gray-400">{song.music_style}</p>
              </div>
              {song.audio_url && (
                <audio controls className="w-32 h-8" src={song.audio_url} />
              )}
            </div>
          ))}

          {giftSongs.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              Las canciones se est&aacute;n generando...
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {l.createdWith}
        </p>
      </div>
    </div>
  );
}
