import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { Music } from "lucide-react";
import type { GeneratedSong } from "@/types/database";

// Use anon client (no auth needed for public shares)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const LABELS = {
  en: {
    songFor: (name: string) => `A song for ${name}`,
    lyrics: "Lyrics",
    downloadMp3: "Download MP3",
    createdWith: "Created with BabyBeats — AI-crafted songs for your baby",
    audioNotSupported: "Your browser does not support audio.",
    lullaby: "Lullaby",
    educational: "Educational",
    fun: "Fun & Play",
  },
  es: {
    songFor: (name: string) => `Una canción para ${name}`,
    lyrics: "Letra",
    downloadMp3: "Descargar MP3",
    createdWith: "Creado con BabyBeats — Canciones hechas con IA para tu bebé",
    audioNotSupported: "Tu navegador no soporta audio.",
    lullaby: "Canción de cuna",
    educational: "Educativa",
    fun: "Diversión",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { data: song } = await supabase
    .from("generated_songs")
    .select("child_name, theme")
    .eq("share_token", token)
    .eq("is_public", true)
    .single();

  if (!song) return { title: "Song not found" };

  return {
    title: `${song.child_name}'s Song | BabyBeats`,
    description: `Listen to a personalized ${song.theme} song created for ${song.child_name} with AI`,
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: song } = await supabase
    .from("generated_songs")
    .select("*")
    .eq("share_token", token)
    .single();

  if (!song) {
    notFound();
  }

  const s = song as GeneratedSong;
  const lang = (s.language === "es" ? "es" : "en") as keyof typeof LABELS;
  const l = LABELS[lang];

  const THEME_LABELS = {
    lullaby: l.lullaby,
    educational: l.educational,
    fun: l.fun,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Music className="h-6 w-6 text-purple-600" />
            <span className="text-xl font-bold text-purple-900">BabyBeats</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {l.songFor(s.child_name)}
          </h1>
          <p className="text-gray-500 mt-1">
            {THEME_LABELS[s.theme]} &middot; {s.language.toUpperCase()}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-6">
          {s.audio_url && (
            <audio controls className="w-full" src={s.audio_url}>
              {l.audioNotSupported}
            </audio>
          )}

          {s.lyrics && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                {l.lyrics}
              </p>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
                {s.lyrics}
              </pre>
            </div>
          )}

          {s.audio_url && (
            <a
              href={s.audio_url}
              download={`${s.child_name}-babybeats.mp3`}
              className="block w-full bg-purple-600 text-white py-2.5 rounded-lg text-sm font-medium text-center hover:bg-purple-700 transition-colors"
            >
              {l.downloadMp3}
            </a>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {l.createdWith}
        </p>
      </div>
    </div>
  );
}
