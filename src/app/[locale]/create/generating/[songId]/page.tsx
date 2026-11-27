"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
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
  return <SongResult key={songId} songId={songId} />;
}

function SongResult({ songId }: { songId: string }) {
  const router = useRouter();
  const t = useTranslations("generating");
  const tp = useTranslations("platforms");

  const [status, setStatus] = useState<"generating" | "completed" | "failed" | "unavailable" | "signedOut">(
    "generating",
  );
  const [audioUrlA, setAudioUrlA] = useState<string | null>(null);
  const [audioUrlB, setAudioUrlB] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [selected, setSelected] = useState<"a" | "b">("a");
  const [childName, setChildName] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [stage, setStage] = useState("PENDING");
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showSpotify, setShowSpotify] = useState(false);
  const [showApple, setShowApple] = useState(false);

  const selectedUrl = selected === "a" ? audioUrlA : audioUrlB;

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const res = await fetch(`/api/generate/status?songId=${encodeURIComponent(songId)}`, {
          signal: controller.signal, cache: "no-store",
        });
        if (controller.signal.aborted) return;
        if (res.status === 401 || res.status === 404) {
          setStatus(res.status === 401 ? "signedOut" : "unavailable");
          return;
        }
        if (!res.ok) throw new Error("Status unavailable");
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (data.status === "completed") {
          setAudioUrlA(data.audioUrlA);
          setAudioUrlB(data.audioUrlB);
          setCoverImage(data.coverImage);
          setChildName(data.childName);
          setShareToken(data.shareToken);
          setStatus("completed");
          return;
        }
        if (data.status !== "generating") {
          setStatus(data.status === "failed" ? "failed" : "unavailable");
          return;
        }
        setStage(data.sunoStatus ?? "PENDING");
      } catch {
        if (controller.signal.aborted) return;
        setStage("RECONNECTING");
      }
      timer = setTimeout(poll, 15000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [songId]);

  useEffect(() => {
    if (status !== "generating") return;
    const timer = setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  const stageLabel = stage === "RECONNECTING" ? t("reconnecting")
    : stage === "FIRST_SUCCESS" ? t("firstReady")
    : stage === "TEXT_SUCCESS" ? t("steps.composing") : t("steps.preparing");

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
          <p role="status" className="text-muted-foreground mb-4">{stageLabel}</p>
          <p className="text-sm text-muted-foreground">
            {Math.floor(elapsed / 60)}:
            {(elapsed % 60).toString().padStart(2, "0")} {t("elapsed")}
          </p>

          <p className="text-xs text-muted-foreground mt-6">{t("patience")}</p>
          <Link href="/my-songs" className="inline-block mt-3 text-primary underline">{t("mySongs")}</Link>
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
            {shareToken && <button
              onClick={copyShareLink}
              className="flex-1 flex items-center justify-center gap-2 border border-border py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <Share2 className="h-4 w-4" />
              {copied ? t("copied") : t("shareLink")}
            </button>}
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

      {(status === "unavailable" || status === "signedOut") && (
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-6">
            {status === "signedOut" ? t("sessionExpired") : t("unavailable")}
          </h1>
          <Link
            href={status === "signedOut"
              ? { pathname: "/auth/login", query: { next: `/create/generating/${encodeURIComponent(songId)}` } }
              : "/my-songs"}
            className="text-primary underline"
          >
            {status === "signedOut" ? t("signIn") : t("mySongs")}
          </Link>
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
