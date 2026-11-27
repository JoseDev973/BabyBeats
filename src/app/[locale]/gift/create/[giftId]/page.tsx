"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import {
  Baby,
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

type Step = "loading" | "payment" | "info" | "mode" | "custom" | "confirm";

export default function GiftCreatePage() {
  const { giftId } = useParams<{ giftId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentResult = searchParams.get("payment");
  const t = useTranslations("gift");
  const locale = useLocale();
  const tc = useTranslations("create");

  const [step, setStep] = useState<Step>("loading");
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
  const [redeemed, setRedeemed] = useState(false);
  const [resumeSaved, setResumeSaved] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = null;
  }, []);

  const pollUntilReady = useCallback(() => {
    stopPolling();
    const startedAt = Date.now();
    async function poll() {
      const g = await fetch(`/api/gift/status?giftId=${encodeURIComponent(giftId)}`)
        .then((response) => response.ok ? response.json() : null).catch(() => null);
      if (!pollRef.current) return;
      if (g && ["ready", "delivered", "redeemed"].includes(g.status)) {
        if (g.delivery_token) setDeliveryToken(g.delivery_token);
        setRedeemed(g.status === "redeemed");
        setGenerating(false);
        stopPolling();
      } else if (g?.retryAvailable || g?.status === "personalizing" || Date.now() - startedAt > 15 * 60_000) {
        setGenerating(false);
        setGenerationError(t(g?.retryAvailable || g?.status === "personalizing" ? "generationFailed" : "checkAlbumStatus"));
        stopPolling();
      } else {
        pollRef.current = setTimeout(poll, 30000);
      }
    }
    pollRef.current = setTimeout(poll, 30000);
  }, [giftId, stopPolling, t]);

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let paymentPoll: ReturnType<typeof setInterval> | null = null;

    async function load() {
      const { data } = await supabase
        .from("gifts")
        .select("pack_type, total_songs, child_name, language, status, paid_at, delivery_mode, delivery_token, gift_songs(count)")
        .eq("id", giftId)
        .single();

      if (cancelled) return;
      if (!data) {
        router.push("/gift");
        return;
      }

      setDeliveryMode(data.delivery_mode);
      setDeliveryToken(data.delivery_token);
      setPackType(data.pack_type);
      setTotalSongs(data.total_songs);
      if (data.child_name && data.child_name !== "—") setChildName(data.child_name);
      if (data.language) setLanguage(data.language);

      if (["ready", "delivered", "redeemed"].includes(data.status)) {
        setRedeemed(data.status === "redeemed" && data.delivery_mode === "redeem");
        setStep("confirm");
        return;
      }
      if (data.paid_at && ["personalizing", "generating"].includes(data.status) &&
          data.gift_songs?.[0]?.count === 0) {
        setResumeSaved(false);
        setStep("info");
        return;
      }
      if (data.status === "personalizing") {
        setResumeSaved(true);
        setGenerationError(t("generationFailed"));
        setStep("confirm");
        return;
      }
      if (data.status === "generating") {
        setResumeSaved(true);
        setGenerating(true);
        setStep("confirm");
        pollUntilReady();
        return;
      }
      if (data.paid_at) {
        setStep("info");
        return;
      }

      setStep("payment");
      if (paymentResult === "failure") {
        setPaymentError(t("paymentFailed"));
        return;
      }
      if (paymentResult === "success" || paymentResult === "pending") {
        // Mercado Pago's webhook marks the gift paid; wait for it
        setConfirmingPayment(true);
        const startedAt = Date.now();
        paymentPoll = setInterval(async () => {
          const { data: g } = await supabase
            .from("gifts")
            .select("paid_at")
            .eq("id", giftId)
            .single();
          if (g?.paid_at) {
            if (paymentPoll) clearInterval(paymentPoll);
            setConfirmingPayment(false);
            setStep("info");
          } else if (Date.now() - startedAt > 3 * 60_000) {
            if (paymentPoll) clearInterval(paymentPoll);
            setConfirmingPayment(false);
            setPaymentError(t("paymentPendingTimeout"));
          }
        }, 3000);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (paymentPoll) clearInterval(paymentPoll);
    };
  }, [giftId, paymentResult, pollUntilReady, router, t]);

  async function handlePay(provider: "stripe" | "mp") {
    setLoading(true);
    setPaymentError("");
    try {
      const res = await fetch(provider === "stripe" ? "/api/checkout/gift" : "/api/checkout-mp/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error === "ALREADY_PAID") {
        setStep("info");
      } else if (res.ok && data.url) {
        track("begin_checkout", { item_id: packType, payment_provider: provider });
        window.location.assign(data.url);
        return;
      } else {
        setPaymentError(t("paymentError"));
      }
    } catch {
      setPaymentError(t("paymentError"));
    }
    setLoading(false);
  }

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
    if (!resumeSaved && !childName.trim()) return;
    setLoading(true);

    setStep("confirm");
    setGenerating(true);
    setGenerationError("");
    try {
      const res = await fetch("/api/gift/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giftId, locale,
          settings: resumeSaved ? undefined : {
            childName: childName.trim(), language, deliveryMode,
            songs: deliveryMode === "link" ? songConfigs : undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerationError(t(data.error === "PAYMENT_REQUIRED" ? "paymentRequired" : "generationFailed"));
      } else if (data.status === "needs_settings") {
        setResumeSaved(false);
        setStep("info");
      } else if (["ready", "delivered", "redeemed"].includes(data.status)) {
        setRedeemed(data.status === "redeemed" && data.deliveryMode === "redeem");
        setDeliveryToken(data.deliveryToken);
        setDeliveryMode(data.deliveryMode);
      } else {
        setDeliveryMode(data.deliveryMode);
        setResumeSaved(true);
        pollUntilReady();
        return;
      }
    } catch {
      setGenerationError(t("generationFailed"));
    } finally {
      setLoading(false);
    }
    setGenerating(false);
  }

  const deliveryPath = deliveryMode === "redeem"
    ? `/${locale}/gift/redeem/${encodeURIComponent(deliveryToken)}`
    : `/gift/deliver/${encodeURIComponent(deliveryToken)}`;
  const deliveryUrl = typeof window === "undefined" ? "" : `${window.location.origin}${deliveryPath}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-16">
      {step === "loading" && (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Step: Payment (gift must be paid before personalizing) */}
      {step === "payment" && (
        <div className="text-center space-y-6">
          {confirmingPayment ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <h1 className="text-2xl font-extrabold">{t("confirmingPayment")}</h1>
              <p className="text-muted-foreground">{t("confirmingPaymentDesc")}</p>
            </>
          ) : (
            <>
              <Gift className="h-12 w-12 text-primary mx-auto" />
              <h1 className="text-2xl font-extrabold">{t("paymentRequiredTitle")}</h1>
              <p className="text-muted-foreground">{t("paymentRequiredDesc", { count: totalSongs })}</p>
              {paymentError && (
                <p className="text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-xl">
                  {paymentError}
                </p>
              )}
              {(["stripe", "mp"] as const).map((provider) => (
                <button
                  key={provider}
                  onClick={() => handlePay(provider)}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                    provider === "stripe"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border-2 border-border hover:border-primary/30"
                  }`}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {provider === "stripe" ? t("payWithCard") : t("payWithMP")}
                </button>
              ))}
            </>
          )}
        </div>
      )}

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
            maxLength={100}
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
            onClick={deliveryMode === "redeem" ? handleConfirm : () => { initSongConfigs(); setStep("mode"); }}
            disabled={loading || !childName.trim()}
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
              {t("albumFor", { count: totalSongs, name: childName })}
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
            <h1 className="text-2xl font-extrabold">{t("albumFor", { count: totalSongs, name: childName })}</h1>
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
                  maxLength={500}
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
              <h1 className="text-2xl font-extrabold">{t(deliveryMode === "redeem" ? "preparingCode" : "generating")}</h1>
              {deliveryMode === "link" && <p className="text-muted-foreground">{t("generatingDesc", { count: totalSongs })}</p>}
            </>
          ) : generationError ? (
            <>
              <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Gift className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-extrabold text-destructive">{generationError}</h1>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
              >
                {t("resumeGift")}
              </button>
            </>
          ) : (
            <>
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Gift className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-extrabold">{t(redeemed ? "codeUsed" : deliveryMode === "redeem" ? "codeReady" : "ready")}</h1>
              {!redeemed && <p className="text-muted-foreground">{deliveryMode === "redeem" ? t("shareRedeemLink", { name: childName }) : t("readyDesc", { name: childName })}</p>}
              <p className="text-sm text-muted-foreground">
                {totalSongs} {t("songs")}
              </p>

              {deliveryToken && !redeemed && (
                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">{t("copyLink")}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={deliveryUrl}
                      aria-label={t("copyLink")}
                      onFocus={(event) => event.target.select()}
                      className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm truncate"
                    />
                    <button
                      onClick={async (event) => {
                        const input = event.currentTarget.previousElementSibling as HTMLInputElement;
                        try {
                          await navigator.clipboard.writeText(deliveryUrl);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        } catch {
                          input.focus();
                          input.select();
                        }
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
