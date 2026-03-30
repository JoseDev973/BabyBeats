import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/stripe/config";

export const metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  const t = useTranslations("pricing");
  const tc = useTranslations("common");

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Free */}
        <div className="rounded-xl border border-border bg-card p-8 flex flex-col">
          <h3 className="text-xl font-bold mb-2">{tc("free")}</h3>
          <div className="mb-6">
            <span className="text-4xl font-bold">$0</span>
            <span className="text-muted-foreground">/{t("monthly")}</span>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            {PLANS.free.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          <div className="border border-border rounded-lg py-2.5 text-center text-sm font-medium text-muted-foreground">
            {t("currentPlan")}
          </div>
        </div>

        {/* Premium Monthly */}
        <div className="rounded-xl border-2 border-primary bg-card p-8 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
            {t("mostPopular")}
          </div>
          <h3 className="text-xl font-bold mb-2">
            {tc("premium")} {t("monthly")}
          </h3>
          <div className="mb-6">
            <span className="text-4xl font-bold">
              ${PLANS.premium_monthly.price}
            </span>
            <span className="text-muted-foreground">/{t("monthly")}</span>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            {PLANS.premium_monthly.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          <Link
            href="/auth/signup"
            className="bg-primary text-primary-foreground rounded-lg py-2.5 text-center text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("subscribe")}
          </Link>
        </div>

        {/* Premium Yearly */}
        <div className="rounded-xl border border-border bg-card p-8 flex flex-col">
          <h3 className="text-xl font-bold mb-2">
            {tc("premium")} {t("yearly")}
          </h3>
          <div className="mb-6">
            <span className="text-4xl font-bold">
              ${PLANS.premium_yearly.price}
            </span>
            <span className="text-muted-foreground">/{t("yearly")}</span>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            {PLANS.premium_yearly.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          <Link
            href="/auth/signup"
            className="bg-primary text-primary-foreground rounded-lg py-2.5 text-center text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("subscribe")}
          </Link>
        </div>
      </div>
    </div>
  );
}
