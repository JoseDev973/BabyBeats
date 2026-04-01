"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Gift, Music, Loader2, CheckCircle, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type GiftInfo = {
  id: string;
  child_name: string;
  total_songs: number;
  pack_type: string;
  status: string;
};

export default function GiftRedeemCodePage() {
  const { code } = useParams<{ code: string }>();
  const t = useTranslations("gift");
  const router = useRouter();

  const [gift, setGift] = useState<GiftInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [credits, setCredits] = useState(0);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function lookupGift() {
      setLoading(true);
      setError("");

      try {
        const supabase = createClient();

        // Check auth status
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsLoggedIn(!!user);

        // Look up gift by delivery_token with redeem mode
        const { data, error: fetchError } = await supabase
          .from("gifts")
          .select("id, child_name, total_songs, pack_type, status, delivery_mode")
          .eq("delivery_token", code)
          .eq("delivery_mode", "redeem")
          .single();

        if (fetchError || !data) {
          setError(t("redeemError"));
          setLoading(false);
          return;
        }

        if (data.status === "redeemed") {
          setError(t("redeemError"));
          setLoading(false);
          return;
        }

        setGift({
          id: data.id,
          child_name: data.child_name,
          total_songs: data.total_songs,
          pack_type: data.pack_type,
          status: data.status,
        });
      } catch {
        setError(t("redeemError"));
      } finally {
        setLoading(false);
      }
    }

    lookupGift();
  }, [code, t]);

  async function handleRedeem() {
    if (!gift) return;
    setRedeeming(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/auth/login?next=/gift/redeem/${code}`);
        return;
      }

      const res = await fetch("/api/gift/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(t("redeemError"));
        setRedeeming(false);
        return;
      }

      setCredits(data.credits);
      setRedeemed(true);
    } catch {
      setError(t("redeemError"));
    } finally {
      setRedeeming(false);
    }
  }

  const PACK_LABELS: Record<string, string> = {
    first_album: t("firstAlbum"),
    sweet_dreams: t("sweetDreams"),
    learning: t("learning"),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
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

        {/* Error state */}
        {error && !gift && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-600">{error}</p>
          </div>
        )}

        {/* Redeemed success state */}
        {redeemed && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-bold text-gray-900 mb-2">
              {t("redeemSuccess", { credits })}
            </p>
            <button
              onClick={() => router.push("/create")}
              className="mt-4 w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all hover:bg-primary/90 hover:shadow-md"
            >
              {t("redeemStartCreating")}
            </button>
          </div>
        )}

        {/* Gift info card */}
        {gift && !redeemed && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-400 p-6 text-center text-white">
              <p className="text-sm font-semibold opacity-90">{t("giftFrom")}</p>
              <h2 className="text-2xl font-extrabold mt-1">{gift.child_name}</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Music className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {PACK_LABELS[gift.pack_type] || gift.pack_type}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t("songsCount", { count: gift.total_songs })}
                  </p>
                </div>
              </div>

              {/* Error within card */}
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-xl text-center">
                  {error}
                </p>
              )}

              {isLoggedIn ? (
                <button
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {redeeming && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("redeemStartCreating")}
                </button>
              ) : (
                <button
                  onClick={() =>
                    router.push(`/auth/login?next=/gift/redeem/${code}`)
                  }
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all hover:bg-primary/90 hover:shadow-md"
                >
                  {t("redeemButton")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
