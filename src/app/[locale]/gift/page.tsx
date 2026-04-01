"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Gift, Moon, BookOpen, Star, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PACKS = [
  {
    type: "first_album" as const,
    songs: 10,
    price: 14.99,
    popular: true,
    icon: Star,
    color: "text-amber-500",
    gradient: "from-amber-50 to-orange-50",
  },
  {
    type: "sweet_dreams" as const,
    songs: 5,
    price: 9.99,
    popular: false,
    icon: Moon,
    color: "text-indigo-500",
    gradient: "from-indigo-50 to-purple-50",
  },
  {
    type: "learning" as const,
    songs: 5,
    price: 9.99,
    popular: false,
    icon: BookOpen,
    color: "text-emerald-500",
    gradient: "from-emerald-50 to-teal-50",
  },
];

export default function GiftPage() {
  const t = useTranslations("gift");
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function selectPack(packType: string, totalSongs: number) {
    setLoading(packType);
    setError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: gift, error: insertError } = await supabase
        .from("gifts")
        .insert({
          buyer_id: user.id,
          pack_type: packType,
          total_songs: totalSongs,
          child_name: "—",
          status: "personalizing",
        })
        .select("id")
        .single();

      if (insertError || !gift) {
        setError(insertError?.message || "Error creating gift");
        setLoading(null);
        return;
      }

      router.push(`/gift/create/${gift.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-gold/20 text-accent-foreground px-4 py-1.5 rounded-full text-sm font-bold mb-6">
          <Gift className="h-4 w-4" />
          {t("heroTitle")}
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
          {t("heroTitle")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("heroSubtitle")}
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-xl text-center mb-8 max-w-md mx-auto">
          {error}
        </p>
      )}

      {/* Packs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PACKS.map((pack) => (
          <div
            key={pack.type}
            className={`relative rounded-2xl bg-gradient-to-br ${pack.gradient} border-2 p-8 flex flex-col items-center text-center transition-all hover:scale-[1.02] hover:shadow-lg ${
              pack.popular ? "border-primary shadow-md" : "border-border"
            }`}
          >
            {pack.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                {t("bestValue")}
              </div>
            )}

            <div className="h-16 w-16 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm mb-4">
              <pack.icon className={`h-8 w-8 ${pack.color}`} />
            </div>

            <h3 className="text-xl font-bold mb-1">
              {t(pack.type === "first_album" ? "firstAlbum" : pack.type === "sweet_dreams" ? "sweetDreams" : "learning")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t(pack.type === "first_album" ? "firstAlbumDesc" : pack.type === "sweet_dreams" ? "sweetDreamsDesc" : "learningDesc")}
            </p>

            <p className="text-sm text-muted-foreground mb-2">
              {t("songsCount", { count: pack.songs })}
            </p>

            <div className="mb-6">
              <span className="text-3xl font-extrabold">${pack.price}</span>
            </div>

            <button
              onClick={() => selectPack(pack.type, pack.songs)}
              disabled={loading !== null}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                pack.popular
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md"
                  : "border-2 border-border hover:border-primary/30 hover:bg-white/50"
              } disabled:opacity-50`}
            >
              {loading === pack.type && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("selectPack")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
