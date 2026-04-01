"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Music,
  Download,
  Share2,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function GeneratingPage() {
  const { songId } = useParams<{ songId: string }>();
  const router = useRouter();
  const t = useTranslations("generating");
  const tp = useTranslations("platforms");

  const STEPS = [
    { label: t("steps.preparing"), pct: 10 },
    { label: t("steps.composing"), pct: 25 },
    { label: t("steps.instruments"), pct: 45 },
    { label: t("steps.vocals"), pct: 65 },
    { label: t("steps.mixing"), pct: 80 },
    { label: t("steps.almost"), pct: 92 },
  ];

  const [status, setStatus] = useState<"generating" | "completed" | "failed">(
    "generating",
  );
  const [audioUrlA, setAudioUrlA] = useState<string | null>(null);
  const [audioUrlB, setAudioUrlB] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [selected, setSelected] = useState<"a" | "b">("a");
  const [childName, setChildName] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showSpotify, setShowSpotify] = useState(false);
  const [showApple, setShowApple] = useState(false);

  const selectedUrl = selected === "a" ? audioUrlA : audioUrlB;

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/generate/status?songId=${songId}`);
      const data = await res.json();

      if (data.status === "completed") {
        setStatus("completed");
        setAudioUrlA(data.audioUrlA);
        setAudioUrlB(data.audioUrlB);
        setCoverImage(data.coverImage);
        setChildName(data.childName);
        setShareToken(data.shareToken);
        setProgress(100);
      } else if (data.status === "failed") {
        setStatus("failed");
      }
    } catch {
      // Keep polling
    }
  }, [songId]);

  useEffect(() => {
    if (status !== "generating") return;
    const interval = setInterval(pollStatus, 5000);
    pollStatus();
    return () => clearInterval(interval);
  }, [status, pollStatus]);

  useEffect(() => {
    if (status !== "generating") return;
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        const idx = Math.min(Math.floor(next / 20), STEPS.length - 1);
        setStepIndex(idx);
        setProgress(STEPS[idx].pct);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function copyShareLink() {
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 sm:py-24">
      {/* Generating */}
      {status === "generating" && (
        <div className="text-center">
          <div className="relative h-24 w-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <div
              className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
              style={{ animationDuration: "2s" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
          <p className="text-muted-foreground mb-8">{STEPS[stepIndex].label}</p>

          <div className="w-full bg-muted rounded-full h-3 mb-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {progress}% &middot;{" "}
            {Math.floor(elapsed / 60)}:
            {(elapsed % 60).toString().padStart(2, "0")} {t("elapsed")}
          </p>

          <p className="text-xs text-muted-foreground mt-6">{t("patience")}</p>
        </div>
      )}

      {/* Completed */}
      {status === "completed" && (
        <div>
          <div className="text-center">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>

            <h1 className="text-2xl font-bold mb-2">
              {t("ready", { name: childName })}
            </h1>
            <p className="text-muted-foreground mb-8">{t("created")}</p>
          </div>

          {/* Cover art */}
          {coverImage && (
            <div className="mx-auto w-40 h-40 rounded-2xl overflow-hidden mb-6 shadow-lg">
              <img
                src={coverImage}
                alt={`Cover art for ${childName}`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Variation selector */}
          {audioUrlA && audioUrlB && (
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setSelected("a")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                  selected === "a"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {t("versionA")}
              </button>
              <button
                onClick={() => setSelected("b")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                  selected === "b"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {t("versionB")}
              </button>
            </div>
          )}

          {/* Audio player */}
          {selectedUrl && (
            <div className="bg-card rounded-xl p-6 border border-border mb-6">
              <div className="flex items-center gap-3 mb-4">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Music className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="text-left">
                  <p className="font-medium">
                    {t("ready", { name: childName })}
                  </p>
                  <p className="text-xs text-muted-foreground">BabyBeats</p>
                </div>
              </div>
              <audio controls className="w-full" key={selectedUrl} src={selectedUrl}>
                Your browser does not support audio.
              </audio>
            </div>
          )}

          <div className="flex gap-3 mb-4">
            {selectedUrl && (
              <a
                href={selectedUrl}
                download={`${childName}-babybeats.mp3`}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                {t("download")}
              </a>
            )}
            <button
              onClick={copyShareLink}
              className="flex-1 flex items-center justify-center gap-2 border border-border py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <Share2 className="h-4 w-4" />
              {copied ? t("copied") : t("shareLink")}
            </button>
          </div>

          {/* Platform guides */}
          <div className="mt-8 border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-muted/30">
              <h3 className="font-semibold text-sm">{tp("title")}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {tp("subtitle")}
              </p>
            </div>

            {/* Spotify guide */}
            <button
              onClick={() => setShowSpotify(!showSpotify)}
              className="w-full flex items-center justify-between px-5 py-3 border-t border-border hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-[#1DB954] rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <span className="text-sm font-medium">
                  {tp("spotify.title")}
                </span>
              </div>
              {showSpotify ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showSpotify && (
              <div className="px-5 py-4 border-t border-border bg-muted/10">
                <ol className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      1.
                    </span>
                    {tp("spotify.step1")}
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      2.
                    </span>
                    {tp("spotify.step2")}
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      3.
                    </span>
                    {tp("spotify.step3")}
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      4.
                    </span>
                    {tp("spotify.step4")}
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      5.
                    </span>
                    {tp("spotify.step5")}
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      6.
                    </span>
                    {tp("spotify.step6")}
                  </li>
                </ol>
              </div>
            )}

            {/* Apple Music guide */}
            <button
              onClick={() => setShowApple(!showApple)}
              className="w-full flex items-center justify-between px-5 py-3 border-t border-border hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gradient-to-b from-[#FC3C44] to-[#C52D9C] rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">A</span>
                </div>
                <span className="text-sm font-medium">
                  {tp("apple.title")}
                </span>
              </div>
              {showApple ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showApple && (
              <div className="px-5 py-4 border-t border-border bg-muted/10">
                <ol className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      1.
                    </span>
                    {tp("apple.step1")}
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      2.
                    </span>
                    {tp("apple.step2")}
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      3.
                    </span>
                    {tp("apple.step3")}
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      4.
                    </span>
                    {tp("apple.step4")}
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      5.
                    </span>
                    {tp("apple.step5")}
                  </li>
                </ol>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => router.push("/create")}
              className="flex-1 border border-border py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              {t("createAnother")}
            </button>
            <button
              onClick={() => router.push("/my-songs")}
              className="flex-1 border border-border py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              {t("mySongs")}
            </button>
          </div>
        </div>
      )}

      {/* Failed */}
      {status === "failed" && (
        <div className="text-center">
          <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold mb-2">{t("failed")}</h1>
          <p className="text-muted-foreground mb-8">{t("failedHint")}</p>

          <button
            onClick={() => router.push("/create")}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("tryAgain")}
          </button>
        </div>
      )}
    </div>
  );
}
