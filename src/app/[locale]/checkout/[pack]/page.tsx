import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { ArrowLeft, CreditCard } from "lucide-react";
import { CREDIT_PACKS, CreditPackKey } from "@/lib/stripe/credit-packs";
import { CREDIT_PACKS_COP } from "@/lib/mercado-pago/config";
import { createClient } from "@/lib/supabase/server";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; pack: string }>;
}) {
  const { locale, pack } = await params;

  if (!(pack in CREDIT_PACKS)) {
    redirect(`/${locale}/pricing`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/checkout/${pack}`);
  }

  const t = await getTranslations({ locale, namespace: "checkout" });
  const selectedPack = CREDIT_PACKS[pack as CreditPackKey];
  const selectedPackCOP = CREDIT_PACKS_COP[pack as CreditPackKey];

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToPricing")}
      </Link>

      <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>

      {/* Order summary */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t("orderSummary")}
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">{selectedPack.name}</p>
            <p className="text-sm text-muted-foreground">
              {t("credits", { count: selectedPack.credits })}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">USD ${selectedPack.price}</p>
            <p className="text-sm text-muted-foreground">
              ${selectedPackCOP.price.toLocaleString("es-CO")} COP
            </p>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <div className="flex flex-col gap-3">
        <a
          href={`/api/checkout?pack=${pack}`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          <CreditCard className="h-4 w-4" />
          {t("payWithStripe")} — USD ${selectedPack.price}
        </a>

        <a
          href={`/api/checkout-mp?pack=${pack}`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#009ee3] text-[#009ee3] text-sm font-bold hover:bg-[#009ee3]/10 transition-colors"
        >
          {t("payWithMP")} — ${selectedPackCOP.price.toLocaleString("es-CO")} COP
        </a>
      </div>
    </div>
  );
}
