import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Check, Sparkles, Gift } from "lucide-react";
import { CREDIT_PACKS } from "@/lib/stripe/credit-packs";
import { CREDIT_PACKS_COP } from "@/lib/mercado-pago/config";
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

  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    // Not logged in
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          {t("heroTitle")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("heroSubtitle")}
        </p>
      </div>

      {/* Free tier */}
      <div className="max-w-md mx-auto mb-12 p-6 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-gold/10 text-center">
        <Gift className="h-8 w-8 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-bold mb-1">{t("firstSongFree")}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("firstSongFreeDesc")}
        </p>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          {t("createFreeSong")}
        </Link>
      </div>

      {/* Credit packs */}
      <h2 className="text-2xl font-bold text-center mb-8">
        {t("needMoreSongs")}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {Object.entries(CREDIT_PACKS).map(([packKey, pack]) => {
          const packCOP = CREDIT_PACKS_COP[packKey as keyof typeof CREDIT_PACKS_COP];
          return (
            <div
              key={pack.name}
              className={`rounded-2xl bg-card p-8 flex flex-col relative ${
                pack.popular
                  ? "border-2 border-primary shadow-lg"
                  : "border border-border"
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  {t("bestValue")}
                </div>
              )}

              <h3 className="text-xl font-bold mb-1">{pack.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t("songsCount", { count: pack.credits })}
              </p>

              <ul className="space-y-2.5 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("personalizedSongs", { count: pack.credits })}
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("babyNameInLyrics")}
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("mp3Download")}
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("shareableLink")}
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("creditsNeverExpire")}
                </li>
              </ul>

              {/* Payment buttons */}
              <div className="flex flex-col gap-2">
                {isLoggedIn ? (
                  <a
                    href={`/api/checkout?pack=${packKey}`}
                    className={`block py-2.5 rounded-xl text-sm font-bold text-center transition-colors ${
                      pack.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border hover:bg-muted"
                    }`}
                  >
                    {t("payWithStripe")} — USD ${pack.price}
                  </a>
                ) : (
                  <Link
                    href="/auth/signup"
                    className={`py-2.5 rounded-xl text-sm font-bold text-center transition-colors ${
                      pack.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border hover:bg-muted"
                    }`}
                  >
                    {t("payWithStripe")} — USD ${pack.price}
                  </Link>
                )}

                {isLoggedIn ? (
                  <a
                    href={`/api/checkout-mp?pack=${packKey}`}
                    className="block py-2.5 rounded-xl text-sm font-bold text-center border border-[#009ee3] text-[#009ee3] hover:bg-[#009ee3]/10 transition-colors"
                  >
                    {t("payWithMP")} — ${packCOP.price.toLocaleString("es-CO")} COP
                  </a>
                ) : (
                  <Link
                    href="/auth/signup"
                    className="py-2.5 rounded-xl text-sm font-bold text-center border border-[#009ee3] text-[#009ee3] hover:bg-[#009ee3]/10 transition-colors"
                  >
                    {t("payWithMP")} — ${packCOP.price.toLocaleString("es-CO")} COP
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
