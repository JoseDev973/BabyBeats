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

const STYLES = [
  { value: "gentle", label: "Gentle & Soft" },
  { value: "playful", label: "Playful & Upbeat" },
  { value: "classical", label: "Classical" },
  { value: "pop", label: "Pop" },
  { value: "acoustic", label: "Acoustic" },
  { value: "reggaeton", label: "Reggaeton Kids" },
];

const LANGUAGES = [
  { value: "es", label: "Espa\u00f1ol" },
  { value: "en", label: "English" },
  { value: "pt", label: "Portugu\u00eas" },
  { value: "fr", label: "Fran\u00e7ais" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
];

const STEP_KEYS = ["child", "theme", "style", "preview"] as const;
type Step = (typeof STEP_KEYS)[number];

export default function CreateWizard({
  credits,
  totalGenerated,
}: CreateWizardProps) {
  const t = useTranslations("create");
  const router = useRouter();

  const [step, setStep] = useState<Step>("child");
  const [childName, setChildName] = useState("");
  const [theme, setTheme] = useState<SongTheme>("lullaby");
  const [musicStyle, setMusicStyle] = useState("gentle");
  const [language, setLanguage] = useState("es");
  const [customPrompt, setCustomPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedSongId, setGeneratedSongId] = useState<string | null>(null);

  const stepIndex = STEP_KEYS.indexOf(step);
  const isFirstSong = totalGenerated === 0;
  const hasCredits = credits > 0 || isFirstSong;

  async function generateLyrics() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/generate/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName,
          theme,
          musicStyle,
          language,
          customPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate lyrics");

      setLyrics(data.lyrics);
      setGeneratedSongId(data.songId);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
      if (!res.ok) throw new Error(data.error || "Failed to generate audio");

      router.push(`/create/generating/${generatedSongId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function goNext() {
    if (step === "child" && !childName.trim()) return;
    if (step === "style") {
      generateLyrics();
      return;
    }
    if (step === "preview") {
      generateAudio();
      return;
    }
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEP_KEYS.length) setStep(STEP_KEYS[nextIndex]);
  }

  function goBack() {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) setStep(STEP_KEYS[prevIndex]);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-16">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
          <Sparkles className="h-4 w-4" />
          {isFirstSong
            ? t("firstFree")
            : t("creditsRemaining", { count: credits })}
        </div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-10">
        {STEP_KEYS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= stepIndex ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step: Child name */}
      {step === "child" && (
        <div className="space-y-6">
          <div className="text-center">
            <Baby className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("childStep")}</h2>
            <p className="text-muted-foreground">{t("childHint")}</p>
          </div>
          <input
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder={t("childPlaceholder")}
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-lg text-center focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && goNext()}
          />
        </div>
      )}

      {/* Step: Theme */}
      {step === "theme" && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">
              {t("themeStep", { name: childName })}
            </h2>
            <p className="text-muted-foreground">{t("themeHint")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {THEMES.map((th) => (
              <button
                key={th.value}
                onClick={() => setTheme(th.value)}
                className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                  theme === th.value
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <th.icon className={`h-8 w-8 ${th.color}`} />
                <span className="font-medium">{t(th.value)}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block text-muted-foreground">
              {t("customPrompt")}
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={t("customPlaceholder")}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>
      )}

      {/* Step: Style & Language */}
      {step === "style" && (
        <div className="space-y-6">
          <div className="text-center">
            <Music className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("styleStep")}</h2>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {t("musicStyle")}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setMusicStyle(s.value)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    musicStyle === s.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {t("language")}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLanguage(l.value)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    language === l.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step: Preview lyrics */}
      {step === "preview" && (
        <div className="space-y-6">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {t("previewStep", { name: childName })}
            </h2>
            <p className="text-muted-foreground">{t("previewHint")}</p>
          </div>

          <div className="bg-muted/50 rounded-xl p-6 border border-border">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
              {lyrics}
            </pre>
          </div>

          {!hasCredits && (
            <div className="bg-accent/20 border border-accent rounded-lg p-4 text-center">
              <Coins className="h-5 w-5 text-accent-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">{t("needCredits")}</p>
              <button
                onClick={() => router.push("/pricing")}
                className="mt-2 text-sm text-primary font-medium hover:underline"
              >
                {t("buyCredits")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-4 text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-lg">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-10">
        <button
          onClick={goBack}
          disabled={stepIndex === 0}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-0"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </button>

        <button
          onClick={goNext}
          disabled={
            loading ||
            (step === "child" && !childName.trim()) ||
            (step === "preview" && !hasCredits)
          }
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {step === "style"
            ? t("generateLyrics")
            : step === "preview"
              ? t("generateAudio")
              : t("next")}
          {!loading && step !== "preview" && step !== "style" && (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
