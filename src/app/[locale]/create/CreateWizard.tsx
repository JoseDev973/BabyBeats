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
  Check,
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

const STEPS = ["child", "theme", "style", "preview", "result"] as const;
type Step = (typeof STEPS)[number];

export default function CreateWizard({
  credits,
  totalGenerated,
}: CreateWizardProps) {
  const t = useTranslations();
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);
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

      setAudioUrl(data.audioUrl);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
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
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex]);
  }

  function goBack() {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) setStep(STEPS[prevIndex]);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-16">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
          <Sparkles className="h-4 w-4" />
          {isFirstSong
            ? "Your first song is free!"
            : `${credits} credits remaining`}
        </div>
        <h1 className="text-3xl font-bold">Create a song for your baby</h1>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-10">
        {STEPS.map((s, i) => (
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
            <h2 className="text-xl font-semibold mb-2">
              What&apos;s your baby&apos;s name?
            </h2>
            <p className="text-muted-foreground">
              This name will appear in the lyrics of the song
            </p>
          </div>
          <input
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="e.g., Sofia, Mateo, Emma..."
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
              What kind of song for {childName}?
            </h2>
            <p className="text-muted-foreground">Choose a theme</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                  theme === t.value
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <t.icon className={`h-8 w-8 ${t.color}`} />
                <span className="font-medium capitalize">{t.value}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block text-muted-foreground">
              Any specific request? (optional)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., include animals, mention bedtime, about counting to 10..."
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
            <h2 className="text-xl font-semibold mb-2">
              Pick a style and language
            </h2>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Music Style
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
            <label className="text-sm font-medium mb-2 block">Language</label>
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
              Here are the lyrics for {childName}!
            </h2>
            <p className="text-muted-foreground">
              Review the lyrics, then generate the audio
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-6 border border-border">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
              {lyrics}
            </pre>
          </div>

          {!hasCredits && (
            <div className="bg-accent/20 border border-accent rounded-lg p-4 text-center">
              <Coins className="h-5 w-5 text-accent-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">
                You need credits to generate audio
              </p>
              <button
                onClick={() => router.push("/pricing")}
                className="mt-2 text-sm text-primary font-medium hover:underline"
              >
                Buy credits
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step: Result */}
      {step === "result" && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {childName}&apos;s song is ready!
            </h2>
          </div>

          {audioUrl && (
            <div className="bg-card rounded-xl p-6 border border-border space-y-4">
              <audio controls className="w-full" src={audioUrl}>
                Your browser does not support audio.
              </audio>

              <div className="flex gap-3">
                <a
                  href={audioUrl}
                  download={`${childName}-babybeats.mp3`}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium text-center hover:bg-primary/90 transition-colors"
                >
                  Download MP3
                </a>
                <button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/share/${generatedSongId}`;
                    navigator.clipboard.writeText(shareUrl);
                  }}
                  className="flex-1 border border-border py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  Copy Share Link
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("child");
                setChildName("");
                setLyrics("");
                setAudioUrl(null);
                setGeneratedSongId(null);
              }}
              className="flex-1 border border-border py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              Create Another
            </button>
            <button
              onClick={() => router.push("/my-songs")}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              My Songs
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-4 text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-lg">
          {error}
        </p>
      )}

      {/* Navigation */}
      {step !== "result" && (
        <div className="flex justify-between mt-10">
          <button
            onClick={goBack}
            disabled={stepIndex === 0}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
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
              ? "Generate Lyrics"
              : step === "preview"
                ? "Generate Audio"
                : "Next"}
            {!loading && step !== "preview" && step !== "style" && (
              <ArrowRight className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
