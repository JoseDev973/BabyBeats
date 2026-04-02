"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { CREDIT_PACKS } from "@/lib/stripe/credit-packs";
import { CREDIT_PACKS_COP } from "@/lib/mercado-pago/config";

type Currency = "USD" | "COP";

export function PricingPacks({ locale }: { locale: string }) {
  const t = useTranslations("pricing");
  const [currency, setCurrency] = useState<Currency>("USD");

  return (
    <>
      {/* Currency selector */}
      <div className="flex justify-center mb-8 mt-6">
        <div className="inline-flex rounded-xl border border-border p-1 gap-1">
          {(["USD", "COP"] as Currency[]).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                currency === c
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c === "USD" ? t("currencyUSD") : t("currencyCOP")}
            </button>
          ))}
        </div>
      </div>

      {/* Packs grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {Object.entries(CREDIT_PACKS).map(([packKey, pack]) => {
          const packCOP = CREDIT_PACKS_COP[packKey as keyof typeof CREDIT_PACKS_COP];
          const displayPrice = currency === "USD"
            ? `USD $${pack.price}`
            : `$${packCOP.price.toLocaleString("es-CO")} COP`;

          return (
            <div
              key={packKey}
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

              <h3 className="text-xl font-bold mb-1">{t(`pack_${packKey}` as any)}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t("songsCount", { count: pack.credits })}
              </p>

              <div className="mb-6">
                <span className="text-3xl font-bold">{displayPrice}</span>
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

              <a
                href={`/${locale}/checkout/${packKey}`}
                className={`py-2.5 rounded-xl text-sm font-bold text-center transition-colors ${
                  pack.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border hover:bg-muted"
                }`}
              >
                {t("choosePlan")}
              </a>
            </div>
          );
        })}
      </div>
    </>
  );
}
