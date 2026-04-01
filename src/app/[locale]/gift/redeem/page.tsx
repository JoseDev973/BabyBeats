"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Gift, Loader2 } from "lucide-react";

export default function GiftRedeemPage() {
  const t = useTranslations("gift");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");

    // Navigate to the code-specific page for validation
    router.push(`/gift/redeem/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-gradient-to-br from-primary/20 to-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gift className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            {t("redeemTitle")}
          </h1>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-xl text-center mb-6">
            {error}
          </p>
        )}

        {/* Form */}
        <form onSubmit={handleRedeem} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("redeemPlaceholder")}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-center text-lg tracking-widest font-mono"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("redeemButton")}
          </button>
        </form>
      </div>
    </div>
  );
}
