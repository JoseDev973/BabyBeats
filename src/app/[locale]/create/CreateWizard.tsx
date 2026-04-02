"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Music,
  Baby,
  Moon,
  BookOpen,
  PartyPopper,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Coins,
  Disc3,
  Wand2,
  Settings2,
  Lock,
} from "lucide-react";
import type { SongTheme } from "@/types/database";

interface CreateWizardProps {
  credits: number;
  totalGenerated: number;
}

const THEMES: { value: SongTheme; icon: typeof Moon; color: string }[] = [
  { value: "lullaby", icon: Moon, color: "text-indigo-500" },
  { value: "educational", icon: BookOpen, color: "text-emerald-500" },
  { value: "fun", icon: PartyPopper, color: "text-pink-500" },
];

const STYLE_KEYS = ["gentle", "playful", "classical", "pop", "acoustic", "reggaeton"] as const;

const SONG_LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
];

const ALBUM_COUNTS = [3, 5, 10];

const AUTO_THEMES: SongTheme[] = ["lullaby", "educational", "fun", "lullaby", "fun", "educational", "lullaby", "fun", "educational", "lullaby"];
const AUTO_STYLES: string[] = ["gentle", "playful", "pop", "acoustic", "reggaeton", "classical", "gentle", "playful", "pop", "acoustic"];

type Mode = "choose" | "single" | "album";
type SingleStep = "child" | "theme" | "style" | "preview";
type AlbumStep = "child" | "count" | "albumMode" | "albumCustom" | "albumConfirm";

export default function CreateWizard({
  credits,
  totalGenerated,
}: CreateWizardProps) {
  const t = useTranslations("create");
  const router = useRouter();

  // Mode
  const [mode, setMode] = useState<Mode>("choose");

  // Shared
  const [childName, setChildName] = useState("");
  const [language, setLanguage] = useState("es");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Single song state
  const [singleStep, setSingleStep] = useState<SingleStep>("child");
  const [theme, setTheme] = useState<SongTheme>("lullaby");
  const [musicStyle, setMusicStyle] = useState("gentle");
  const [customPrompt, setCustomPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [generatedSongId, setGeneratedSongId] = useState<string | null>(null);

  // Album state
  const [albumStep, setAlbumStep] = useState<AlbumStep>("child");
  const [albumCount, setAlbumCount] = useState(5);
  const [albumMode, setAlbumMode] = useState<"quick" | "custom">("quick");
  const [songConfigs, setSongConfigs] = useState<{ theme: SongTheme; style: string; prompt: string }[]>([]);
  const [albumPrompt, setAlbumPrompt] = useState("");

  const isFirstSong = totalGenerated === 0;
  const hasCredits = credits > 0 || isFirstSong;

  const SINGLE_STEPS: SingleStep[] = ["child", "theme", "style", "preview"];
  const singleStepIndex = SINGLE_STEPS.indexOf(singleStep);

  const ALBUM_STEPS: AlbumStep[] = ["child", "count", "albumMode", "albumCustom", "albumConfirm"];
  const albumStepIndex = ALBUM_STEPS.indexOf(albumStep);

  function initAlbumConfigs(count: number) {
    setSongConfigs(
      Array.from({ length: count }, (_, i) => ({
        theme: AUTO_THEMES[i % AUTO_THEMES.length],
        style: AUTO_STYLES[i % AUTO_STYLES.length],
        prompt: "",
      }))
    );
  }

  // --- Single song functions ---
  async function generateLyrics() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childName, theme, musicStyle, language, customPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failedLyrics"));
      setLyrics(data.lyrics);
      setGeneratedSongId(data.songId);
      setSingleStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  async function generateAudio() {
    if (!generatedSongId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: generatedSongId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failedAudio"));
      router.push(`/create/generating/${generatedSongId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWrong"));
      setLoading(false);
    }
  }

  function singleGoNext() {
    if (singleStep === "child" && !childName.trim()) return;
    if (singleStep === "style") { generateLyrics(); return; }
    if (singleStep === "preview") { generateAudio(); return; }
    const next = singleStepIndex + 1;
    if (next < SINGLE_STEPS.length) setSingleStep(SINGLE_STEPS[next]);
  }

  function singleGoBack() {
    if (singleStepIndex === 0) { setMode("choose"); return; }
    setSingleStep(SINGLE_STEPS[singleStepIndex - 1]);
  }

  // --- Album functions ---
  async function albumGenerate() {
    setLoading(true);
    setError("");

    const configs = albumMode === "quick"
      ? Array.from({ length: albumCount }, (_, i) => ({
          theme: AUTO_THEMES[i % AUTO_THEMES.length],
          style: AUTO_STYLES[i % AUTO_STYLES.length],
          prompt: albumPrompt,
        }))
      : songConfigs;

    try {
      // Generate lyrics + audio for each song sequentially
      // First song uses the "first free" logic, rest use credits
      for (let i = 0; i < configs.length; i++) {
        const lyricsRes = await fetch("/api/generate/lyrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childName,
            theme: configs[i].theme,
            musicStyle: configs[i].style,
            language,
            customPrompt: configs[i].prompt || "",
          }),
        });
        const lyricsData = await lyricsRes.json();
        if (!lyricsRes.ok) throw new Error(lyricsData.error || t("failedLyrics"));

        const audioRes = await fetch("/api/generate/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId: lyricsData.songId }),
        });
        const audioData = await audioRes.json();
        if (!audioRes.ok) throw new Error(audioData.error || t("failedAudio"));
      }

      router.push("/my-songs");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWrong"));
      setLoading(false);
    }
  }

  function albumGoNext() {
    if (albumStep === "child" && !childName.trim()) return;
    if (albumStep === "count") { initAlbumConfigs(albumCount); setAlbumStep("albumMode"); return; }
    if (albumStep === "albumMode" && albumMode === "quick") { setAlbumStep("albumConfirm"); return; }
    if (albumStep === "albumMode" && albumMode === "custom") { setAlbumStep("albumCustom"); return; }
    if (albumStep === "albumCustom") { setAlbumStep("albumConfirm"); return; }
    if (albumStep === "albumConfirm") { albumGenerate(); return; }
    const next = albumStepIndex + 1;
    if (next < ALBUM_STEPS.length) setAlbumStep(ALBUM_STEPS[next]);
  }

  function albumGoBack() {
    if (albumStep === "child") { setMode("choose"); return; }
    if (albumStep === "albumCustom") { setAlbumStep("albumMode"); return; }
    if (albumStep === "albumConfirm" && albumMode === "custom") { setAlbumStep("albumCustom"); return; }
    if (albumStep === "albumConfirm" && albumMode === "quick") { setAlbumStep("albumMode"); return; }
    setAlbumStep(ALBUM_STEPS[albumStepIndex - 1]);
  }

  // Compute credits needed for album
  const albumCreditsNeeded = isFirstSong ? Math.max(0, albumCount - 1) : albumCount;
  const albumHasCredits = credits >= albumCreditsNeeded || (isFirstSong && albumCount === 1);

  // --- RENDER ---
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-16">
      {/* Header */}
      <div className="text-center mb-8">
        {isFirstSong ? (
          <div className="inline-flex items-center gap-2 bg-gold/20 text-accent-foreground px-3 py-1 rounded-full text-sm font-bold mb-4">
            <Sparkles className="h-4 w-4" />
            {t("firstFree")}
          </div>
        ) : credits > 0 ? (
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold mb-4">
            <Coins className="h-4 w-4" />
            {t("creditsRemaining", { count: credits })}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-1 rounded-full text-sm font-bold mb-4">
            <Coins className="h-4 w-4" />
            <button onClick={() => router.push("/pricing")} className="hover:underline">{t("noCredits")}</button>
          </div>
        )}
        <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      </div>

      {/* MODE SELECTION */}
      {mode === "choose" && (
        <div className="space-y-4 mt-8">
          <h2 className="text-xl font-bold text-center mb-6">{t("modeTitle")}</h2>
          <div className={`grid grid-cols-1 ${!isFirstSong ? "sm:grid-cols-2" : ""} gap-4`}>
            <button
              onClick={() => { setMode("single"); setSingleStep("child"); }}
              className="p-6 rounded-2xl border-2 border-border hover:border-primary/50 hover:shadow-lg transition-all text-center group"
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Music className="h-7 w-7 text-primary" />
              </div>
              <p className="font-bold text-lg">{t("modeSingle")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("modeSingleDesc")}</p>
            </button>
            {!isFirstSong && (
              <button
                onClick={() => { if (credits > 0) { setMode("album"); setAlbumStep("child"); } }}
                disabled={credits === 0}
                className={`p-6 rounded-2xl border-2 transition-all text-center group ${
                  credits === 0
                    ? "border-border opacity-60 cursor-not-allowed"
                    : "border-border hover:border-primary/50 hover:shadow-lg"
                }`}
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-gold/20 to-accent/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  {credits === 0 ? <Lock className="h-7 w-7 text-muted-foreground" /> : <Disc3 className="h-7 w-7 text-accent-foreground" />}
                </div>
                <p className="font-bold text-lg">{t("modeAlbum")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("modeAlbumDesc")}</p>
                {credits === 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push("/pricing"); }}
                    className="mt-2 text-sm text-primary font-semibold hover:underline"
                  >
                    {t("albumNeedCredits")}
                  </button>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============= SINGLE SONG FLOW ============= */}
      {mode === "single" && (
        <>
          {/* Progress */}
          <div className="flex items-center gap-1 mb-10">
            {SINGLE_STEPS.map((s, i) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= singleStepIndex ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {singleStep === "child" && (
            <div className="space-y-6">
              <div className="text-center">
                <Baby className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">{t("childStep")}</h2>
                <p className="text-muted-foreground">{t("childHint")}</p>
              </div>
              <input type="text" value={childName} onChange={(e) => setChildName(e.target.value)}
                placeholder={t("childPlaceholder")}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-lg text-center focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus onKeyDown={(e) => e.key === "Enter" && singleGoNext()} />
            </div>
          )}

          {singleStep === "theme" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2">{t("themeStep", { name: childName })}</h2>
                <p className="text-muted-foreground">{t("themeHint")}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {THEMES.map((th) => (
                  <button key={th.value} onClick={() => setTheme(th.value)}
                    className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                      theme === th.value ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50"
                    }`}>
                    <th.icon className={`h-8 w-8 ${th.color}`} />
                    <span className="font-semibold">{t(th.value)}</span>
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block text-muted-foreground">{t("customPrompt")}</label>
                <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={t("customPlaceholder")} rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>
          )}

          {singleStep === "style" && (
            <div className="space-y-6">
              <div className="text-center">
                <Music className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">{t("styleStep")}</h2>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">{t("musicStyle")}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {STYLE_KEYS.map((key) => (
                    <button key={key} onClick={() => setMusicStyle(key)}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        musicStyle === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}>{t(key)}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">{t("language")}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SONG_LANGUAGES.map((l) => (
                    <button key={l.value} onClick={() => setLanguage(l.value)}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        language === l.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}>{l.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {singleStep === "preview" && (
            <div className="space-y-6">
              <div className="text-center">
                <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">{t("previewStep", { name: childName })}</h2>
                <p className="text-muted-foreground">{t("previewHint")}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-6 border border-border">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{lyrics}</pre>
              </div>
              {!hasCredits && (
                <div className="bg-accent/20 border border-accent rounded-xl p-4 text-center">
                  <Coins className="h-5 w-5 text-accent-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold">{t("needCredits")}</p>
                  <button onClick={() => router.push("/pricing")} className="mt-2 text-sm text-primary font-semibold hover:underline">{t("buyCredits")}</button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && <p className="mt-4 text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-xl">{error}</p>}

          {/* Nav */}
          <div className="flex justify-between mt-10">
            <button onClick={singleGoBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />{t("back")}
            </button>
            <button onClick={singleGoNext}
              disabled={loading || (singleStep === "child" && !childName.trim()) || (singleStep === "preview" && !hasCredits)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {singleStep === "style" ? t("generateLyrics") : singleStep === "preview" ? t("generateAudio") : t("next")}
              {!loading && singleStep !== "preview" && singleStep !== "style" && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}

      {/* ============= ALBUM FLOW ============= */}
      {mode === "album" && (
        <>
          {/* Progress */}
          <div className="flex items-center gap-1 mb-10">
            {["child", "count", "config", "confirm"].map((s, i) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= Math.min(albumStepIndex, 3) ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {albumStep === "child" && (
            <div className="space-y-6">
              <div className="text-center">
                <Baby className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">{t("childStep")}</h2>
                <p className="text-muted-foreground">{t("childHint")}</p>
              </div>
              <input type="text" value={childName} onChange={(e) => setChildName(e.target.value)}
                placeholder={t("childPlaceholder")}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-lg text-center focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus onKeyDown={(e) => e.key === "Enter" && albumGoNext()} />
              <div>
                <label className="text-sm font-semibold mb-2 block">{t("language")}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SONG_LANGUAGES.map((l) => (
                    <button key={l.value} onClick={() => setLanguage(l.value)}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        language === l.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}>{l.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {albumStep === "count" && (
            <div className="space-y-6">
              <div className="text-center">
                <Disc3 className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">{t("albumCount")}</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {ALBUM_COUNTS.map((n) => (
                  <button key={n} onClick={() => setAlbumCount(n)}
                    className={`p-6 rounded-2xl border-2 text-center transition-all ${
                      albumCount === n ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50"
                    }`}>
                    <p className="text-3xl font-extrabold">{n}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t("songsLabel")}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {albumStep === "albumMode" && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold">{t("songsForChild", { count: albumCount, name: childName })}</h2>
              </div>
              <button onClick={() => setAlbumMode("quick")}
                className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${albumMode === "quick" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gold/20 flex items-center justify-center shrink-0">
                    <Wand2 className="h-6 w-6 text-amber-600" />
                  </div>
                  <div><p className="font-bold">{t("albumQuick")}</p><p className="text-sm text-muted-foreground">{t("albumQuickDesc")}</p></div>
                </div>
              </button>
              <button onClick={() => setAlbumMode("custom")}
                className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${albumMode === "custom" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Settings2 className="h-6 w-6 text-primary" />
                  </div>
                  <div><p className="font-bold">{t("albumCustom")}</p><p className="text-sm text-muted-foreground">{t("albumCustomDesc")}</p></div>
                </div>
              </button>

              <div>
                <label className="text-sm font-semibold mb-1.5 block text-muted-foreground">{t("customPrompt")}</label>
                <textarea value={albumPrompt} onChange={(e) => setAlbumPrompt(e.target.value)}
                  placeholder={t("customPlaceholder")} rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>
          )}

          {albumStep === "albumCustom" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center mb-4">{t("songsForChild", { count: albumCount, name: childName })}</h2>
              {songConfigs.map((config, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-card">
                  <p className="font-bold text-sm mb-3">{t("albumSong", { number: i + 1 })}</p>
                  <div className="flex gap-2 mb-2">
                    {THEMES.map((th) => (
                      <button key={th.value}
                        onClick={() => { const u = [...songConfigs]; u[i].theme = th.value; setSongConfigs(u); }}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                          config.theme === th.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}>
                        <th.icon className={`h-3.5 w-3.5 ${th.color}`} />{t(th.value)}
                      </button>
                    ))}
                  </div>
                  <select value={config.style}
                    onChange={(e) => { const u = [...songConfigs]; u[i].style = e.target.value; setSongConfigs(u); }}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm mb-2">
                    {STYLE_KEYS.map((s) => (<option key={s} value={s}>{t(s)}</option>))}
                  </select>
                  <input type="text" value={config.prompt}
                    onChange={(e) => { const u = [...songConfigs]; u[i].prompt = e.target.value; setSongConfigs(u); }}
                    placeholder={t("customPlaceholder")}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs" />
                </div>
              ))}
            </div>
          )}

          {albumStep === "albumConfirm" && (
            <div className="text-center space-y-6">
              <Disc3 className="h-16 w-16 text-primary mx-auto" />
              <h2 className="text-2xl font-extrabold">{t("songsForChild", { count: albumCount, name: childName })}</h2>
              <p className="text-muted-foreground">{t("language")}: {language.toUpperCase()}</p>
              {!albumHasCredits && (
                <div className="bg-accent/20 border border-accent rounded-xl p-4">
                  <Coins className="h-5 w-5 text-accent-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold">{t("needCredits")} ({albumCreditsNeeded})</p>
                  <button onClick={() => router.push("/pricing")} className="mt-2 text-sm text-primary font-semibold hover:underline">{t("buyCredits")}</button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && <p className="mt-4 text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-xl">{error}</p>}

          {/* Nav */}
          <div className="flex justify-between mt-10">
            <button onClick={albumGoBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />{t("back")}
            </button>
            <button onClick={albumGoNext}
              disabled={loading || (albumStep === "child" && !childName.trim()) || (albumStep === "albumConfirm" && !albumHasCredits)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? t("albumGenerating", { count: albumCount, name: childName }) : albumStep === "albumConfirm" ? t("generateAudio") : t("next")}
              {!loading && albumStep !== "albumConfirm" && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
