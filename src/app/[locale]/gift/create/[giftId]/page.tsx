"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  Baby,
  Music,
  Moon,
  BookOpen,
  PartyPopper,
  Sparkles,
  Wand2,
  Settings2,
  Link2,
  Gift,
  ArrowRight,
  Loader2,
} from "lucide-react";
import type { SongTheme } from "@/types/database";

const THEMES: { value: SongTheme; icon: typeof Moon; color: string }[] = [
  { value: "lullaby", icon: Moon, color: "text-indigo-500" },
  { value: "educational", icon: BookOpen, color: "text-emerald-500" },
  { value: "fun", icon: PartyPopper, color: "text-pink-500" },
];

const STYLE_KEYS = ["gentle", "playful", "classical", "pop", "acoustic", "reggaeton"] as const;

const PACK_THEMES: Record<string, SongTheme[]> = {
  first_album: ["lullaby", "lullaby", "educational", "educational", "fun", "fun", "lullaby", "educational", "fun", "lullaby"],
  sweet_dreams: ["lullaby", "lullaby", "lullaby", "lullaby", "lullaby"],
  learning: ["educational", "educational", "educational", "educational", "educational"],
  custom: [],
};

const PACK_STYLES: Record<string, string[]> = {
  first_album: ["gentle", "acoustic", "playful", "pop", "reggaeton", "playful", "classical", "acoustic", "pop", "gentle"],
  sweet_dreams: ["gentle", "acoustic", "classical", "gentle", "acoustic"],
  learning: ["playful", "pop", "playful", "acoustic", "reggaeton"],
  custom: [],
};

type Step = "info" | "mode" | "custom" | "confirm";

export default function GiftCreatePage() {
  const { giftId } = useParams<{ giftId: string }>();
  const router = useRouter();
  const t = useTranslations("gift");
  const tc = useTranslations("create");

  const [step, setStep] = useState<Step>("info");
  const [childName, setChildName] = useState("");
  const [language, setLanguage] = useState("es");
  const [deliveryMode, setDeliveryMode] = useState<"link" | "redeem">("link");
  const [mode, setMode] = useState<"quick" | "custom">("quick");
  const [packType, setPackType] = useState("first_album");
  const [totalSongs, setTotalSongs] = useState(10);
  const [songConfigs, setSongConfigs] = useState<{ theme: SongTheme; style: string; prompt: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [deliveryToken, setDeliveryToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [giftStatus, setGiftStatus] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("gifts")
      .select("pack_type, total_songs, child_name, language")
      .eq("id", giftId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPackType(data.pack_type);
          setTotalSongs(data.total_songs);
          if (data.child_name && data.child_name !== "—") setChildName(data.child_name);
          if (data.language) setLanguage(data.language);
        }
      });
  }, [giftId]);

  function initSongConfigs() {
    const themes = PACK_THEMES[packType] || Array(totalSongs).fill("lullaby");
    const styles = PACK_STYLES[packType] || Array(totalSongs).fill("gentle");
    setSongConfigs(
      Array.from({ length: totalSongs }, (_, i) => ({
        theme: themes[i] || "lullaby",
        style: styles[i] || "gentle",
        prompt: "",
      }))
    );
  }

  async function handleConfirm() {
    if (!childName.trim()) return;
    setLoading(true);

    const supabase = createClient();

    // Update gift with child info
    await supabase
      .from("gifts")
      .update({
        child_name: childName.trim(),
        language,
        delivery_mode: deliveryMode,
        status: "generating",
        updated_at: new Date().toISOString(),
      })
      .eq("id", giftId);

    // Create song entries
    const configs = mode === "quick"
      ? Array.from({ length: totalSongs }, (_, i) => ({
          theme: (PACK_THEMES[packType] || [])[i] || "lullaby",
          style: (PACK_STYLES[packType] || [])[i] || "gentle",
          prompt: "",
        }))
      : songConfigs;

    const songRows = configs.map((c, i) => ({
      gift_id: giftId,
      position: i + 1,
      theme: c.theme,
      music_style: c.style,
      language,
      custom_prompt: c.prompt || null,
      status: "pending",
    }));

    await supabase.from("gift_songs").insert(songRows);

    // Fetch delivery token
    const { data: giftData } = await supabase
      .from("gifts")
      .select("delivery_token")
      .eq("id", giftId)
      .single();

    if (giftData?.delivery_token) {
      setDeliveryToken(giftData.delivery_token);
    }

    setStep("confirm");
    setLoading(false);

    // Trigger song generation
    setGenerating(true);
    setGenerationError("");
    try {
      const res = await fetch("/api/gift/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === "GIFT_ALREADY_PROCESSING") {
          setGenerationError(t("giftAlreadyProcessing"));
        } else {
          setGenerationError(data.error || "Generation failed");
        }
        setGenerating(false);
        return;
      }

      // Poll for gift completion
      const pollInterval = setInterval(async () => {
        const { data: g } = await supabase
          .from("gifts")
          .select("status")
          .eq("id", giftId)
          .single();

        if (g?.status === "ready") {
          setGiftStatus("ready");
          setGenerating(false);
          clearInterval(pollInterval);
        } else if (g?.status === "failed") {
          setGenerationError("Some songs failed to generate");
          setGenerating(false);
          clearInterval(pollInterval);
        }
      }, 5000);

      // Stop polling after 10 minutes
      setTimeout(() => clearInterval(pollInterval), 600000);
    } catch {
      setGenerationError("Failed to start generation");
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-16">
      {/* Step: Baby info */}
      {step === "info" && (
        <div className="space-y-8">
          <div className="text-center">
            <Baby className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-extrabold mb-2">{t("childName")}</h1>
            <p className="text-muted-foreground">{t("childNameHint")}</p>
          </div>

          <input
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder={t("childNamePlaceholder")}
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-lg text-center focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />

          <div>
            <label className="text-sm font-bold mb-2 block">{t("language")}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { value: "es", label: "Espa\u00f1ol" },
                { value: "en", label: "English" },
                { value: "pt", label: "Portugu\u00eas" },
                { value: "fr", label: "Fran\u00e7ais" },
                { value: "de", label: "Deutsch" },
                { value: "it", label: "Italiano" },
              ].map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLanguage(l.value)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
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

          <div>
            <label className="text-sm font-bold mb-2 block">{t("deliveryMode")}</label>
            <div className="space-y-3">
              <button
                onClick={() => setDeliveryMode("link")}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  deliveryMode === "link" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Link2 className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{t("deliveryLink")}</p>
                    <p className="text-xs text-muted-foreground">{t("deliveryLinkDesc")}</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setDeliveryMode("redeem")}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  deliveryMode === "redeem" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Gift className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{t("deliveryRedeem")}</p>
                    <p className="text-xs text-muted-foreground">{t("deliveryRedeemDesc")}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <button
            onClick={() => { initSongConfigs(); setStep("mode"); }}
            disabled={!childName.trim()}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {t("continue")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step: Quick vs Custom */}
      {step === "mode" && (
        <div className="space-y-8">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-extrabold mb-2">
              {totalSongs} {t("songs")} para {childName}
            </h1>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setMode("quick")}
              className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                mode === "quick" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gold/20 flex items-center justify-center shrink-0">
                  <Wand2 className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold">{t("quickMode")}</p>
                  <p className="text-sm text-muted-foreground">{t("quickModeDesc")}</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode("custom")}
              className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                mode === "custom" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Settings2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold">{t("customMode")}</p>
                  <p className="text-sm text-muted-foreground">{t("customModeDesc")}</p>
                </div>
              </div>
            </button>
          </div>

          {mode === "custom" ? (
            <button
              onClick={() => setStep("custom")}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
            >
              {t("continue")}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? t("generating") : t("continue")}
            </button>
          )}
        </div>
      )}

      {/* Step: Custom song config */}
      {step === "custom" && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold">{totalSongs} {t("songs")} para {childName}</h1>
          </div>

          <div className="space-y-4">
            {songConfigs.map((config, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card">
                <p className="font-bold text-sm mb-3">{t("songNumber", { number: i + 1 })}</p>
                <div className="flex gap-2 mb-2">
                  {THEMES.map((th) => (
                    <button
                      key={th.value}
                      onClick={() => {
                        const updated = [...songConfigs];
                        updated[i].theme = th.value;
                        setSongConfigs(updated);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                        config.theme === th.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <th.icon className={`h-3.5 w-3.5 ${th.color}`} />
                      {tc(th.value)}
                    </button>
                  ))}
                </div>
                <select
                  value={config.style}
                  onChange={(e) => {
                    const updated = [...songConfigs];
                    updated[i].style = e.target.value;
                    setSongConfigs(updated);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm mb-2"
                >
                  {STYLE_KEYS.map((s) => (
                    <option key={s} value={s}>{tc(s)}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={config.prompt}
                  onChange={(e) => {
                    const updated = [...songConfigs];
                    updated[i].prompt = e.target.value;
                    setSongConfigs(updated);
                  }}
                  placeholder={tc("customPlaceholder")}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? t("generating") : t("continue")}
          </button>
        </div>
      )}

      {/* Step: Confirm — Generating or Ready */}
      {step === "confirm" && (
        <div className="text-center space-y-6">
          {generating ? (
            <>
              <div className="relative h-24 w-24 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" style={{ animationDuration: "2s" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold">{t("generating")}</h1>
              <p className="text-muted-foreground">{t("generatingDesc", { count: totalSongs })}</p>
              <p className="text-xs text-muted-foreground">
                {t("songs")}: {totalSongs} para {childName}
              </p>
            </>
          ) : generationError ? (
            <>
              <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Gift className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-extrabold text-destructive">{generationError}</h1>
              <button
                onClick={() => router.push("/gift")}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
              >
                {t("heroTitle")}
              </button>
            </>
          ) : (
            <>
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Gift className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-extrabold">{t("ready")}</h1>
              <p className="text-muted-foreground">{t("readyDesc", { name: childName })}</p>
              <p className="text-sm text-muted-foreground">
                {totalSongs} {t("songs")}
              </p>

              {deliveryToken && (
                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">{t("copyLink")}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/gift/deliver/${deliveryToken}`}
                      className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm truncate"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/gift/deliver/${deliveryToken}`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shrink-0"
                    >
                      {copied ? t("copied") : t("copyLink")}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => router.push("/gift")}
                  className="flex-1 border-2 border-border py-2.5 rounded-xl text-sm font-bold hover:bg-muted transition-all"
                >
                  {t("heroTitle")}
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="flex-1 border-2 border-border py-2.5 rounded-xl text-sm font-bold hover:bg-muted transition-all"
                >
                  Home
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
