"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Music, Download, Share2, CheckCircle2, XCircle, Sparkles } from "lucide-react";

const STEPS = [
  { label: "Preparing your song...", pct: 10 },
  { label: "Composing melody...", pct: 25 },
  { label: "Adding instruments...", pct: 45 },
  { label: "Recording vocals...", pct: 65 },
  { label: "Mixing & mastering...", pct: 80 },
  { label: "Almost there...", pct: 92 },
];

export default function GeneratingPage() {
  const { songId } = useParams<{ songId: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<"generating" | "completed" | "failed">("generating");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [childName, setChildName] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/generate/status?songId=${songId}`);
      const data = await res.json();

      if (data.status === "completed") {
        setStatus("completed");
        setAudioUrl(data.audioUrl);
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

  // Poll every 5 seconds
  useEffect(() => {
    if (status !== "generating") return;

    const interval = setInterval(pollStatus, 5000);
    pollStatus(); // Initial check

    return () => clearInterval(interval);
  }, [status, pollStatus]);

  // Animate progress bar based on time elapsed
  useEffect(() => {
    if (status !== "generating") return;

    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        // Map elapsed seconds to progress steps
        // Typical generation: 60-180 seconds
        const idx = Math.min(Math.floor(next / 20), STEPS.length - 1);
        setStepIndex(idx);
        setProgress(STEPS[idx].pct);
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
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

          <h1 className="text-2xl font-bold mb-2">Creating your song...</h1>
          <p className="text-muted-foreground mb-8">
            {STEPS[stepIndex].label}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-3 mb-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {progress}% &middot; {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")} elapsed
          </p>

          <p className="text-xs text-muted-foreground mt-6">
            This usually takes 1-3 minutes. You can leave this page and check &quot;My Songs&quot; later.
          </p>
        </div>
      )}

      {/* Completed */}
      {status === "completed" && (
        <div className="text-center">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold mb-2">
            {childName}&apos;s song is ready!
          </h1>
          <p className="text-muted-foreground mb-8">
            Your personalized song has been created
          </p>

          {audioUrl && (
            <div className="bg-card rounded-xl p-6 border border-border mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Music className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Song for {childName}</p>
                  <p className="text-xs text-muted-foreground">BabyBeats</p>
                </div>
              </div>
              <audio controls className="w-full" src={audioUrl}>
                Your browser does not support audio.
              </audio>
            </div>
          )}

          <div className="flex gap-3 mb-4">
            {audioUrl && (
              <a
                href={audioUrl}
                download={`${childName}-babybeats.mp3`}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download MP3
              </a>
            )}
            <button
              onClick={copyShareLink}
              className="flex-1 flex items-center justify-center gap-2 border border-border py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <Share2 className="h-4 w-4" />
              {copied ? "Copied!" : "Share Link"}
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/create")}
              className="flex-1 border border-border py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              Create Another
            </button>
            <button
              onClick={() => router.push("/my-songs")}
              className="flex-1 border border-border py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              My Songs
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

          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-8">
            The audio generation failed. Your credit has not been charged.
          </p>

          <button
            onClick={() => router.push("/create")}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
