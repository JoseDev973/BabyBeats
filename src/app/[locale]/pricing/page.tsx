import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Check, Sparkles, Gift } from "lucide-react";
import { CREDIT_PACKS } from "@/lib/stripe/credit-packs";

export const metadata = {
  title: "Pricing",
  description:
    "Affordable credit packs for personalized baby songs. Your first song is free — no credit card required.",
};

export default function PricingPage() {
  const t = useTranslations("pricing");

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
        {Object.values(CREDIT_PACKS).map((pack) => (
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

            <div className="mb-6">
              <span className="text-4xl font-bold">${pack.price}</span>
              <span className="text-muted-foreground text-sm ml-1">
                (${pack.pricePerSong.toFixed(2)}/song)
              </span>
            </div>

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

            <Link
              href="/auth/signup"
              className={`py-2.5 rounded-xl text-sm font-bold text-center transition-colors ${
                pack.popular
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border hover:bg-muted"
              }`}
            >
              {t("buyCredits", { count: pack.credits })}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
