import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Sparkles, Gift } from "lucide-react";
import { PricingPacks } from "@/components/pricing/PricingPacks";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("pricingTitle"),
    description: t("pricingDescription"),
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });

  // Check if user is logged in and has already generated songs
  let isLoggedIn = false;
  let hasGeneratedSongs = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      isLoggedIn = true;
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_songs_generated")
        .eq("id", user.id)
        .single();
      hasGeneratedSongs = (profile?.total_songs_generated ?? 0) > 0;
    }
  } catch {
    // Not logged in
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t("heroTitle")}</h1>
        <p className="text-lg text-muted-foreground">{t("heroSubtitle")}</p>
      </div>

      {/* Free tier - hide if user already generated songs */}
      {!hasGeneratedSongs && (
        <div className="max-w-md mx-auto mb-12 p-6 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-gold/10 text-center">
          <Gift className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-1">{t("firstSongFree")}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isLoggedIn ? t("firstSongFreeDescLoggedIn") : t("firstSongFreeDesc")}
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            {isLoggedIn ? t("createFirstSong") : t("createFreeSong")}
          </Link>
        </div>
      )}

      <h2 className="text-2xl font-bold text-center mb-2">{t("needMoreSongs")}</h2>

      {/* Client component handles currency toggle + pack grid */}
      <PricingPacks locale={locale} />
    </div>
  );
}
