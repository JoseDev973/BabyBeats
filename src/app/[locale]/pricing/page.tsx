import { Link } from "@/i18n/routing";
import { Check, Sparkles, Gift } from "lucide-react";
import { CREDIT_PACKS } from "@/lib/stripe/config";

export const metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Create personalized songs for your baby
        </h1>
        <p className="text-lg text-muted-foreground">
          Your first song is free. Buy credit packs to create more.
        </p>
      </div>

      {/* Free tier */}
      <div className="max-w-md mx-auto mb-12 p-6 rounded-xl border-2 border-primary/30 bg-primary/5 text-center">
        <Gift className="h-8 w-8 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-bold mb-1">First Song Free</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Sign up and create your first personalized baby song at no cost
        </p>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Create Free Song
        </Link>
      </div>

      {/* Credit packs */}
      <h2 className="text-2xl font-bold text-center mb-8">
        Need more songs? Buy credits
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.values(CREDIT_PACKS).map((pack) => (
          <div
            key={pack.name}
            className={`rounded-xl bg-card p-8 flex flex-col relative ${
              pack.popular
                ? "border-2 border-primary shadow-lg"
                : "border border-border"
            }`}
          >
            {pack.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                Best Value
              </div>
            )}

            <h3 className="text-xl font-bold mb-1">{pack.name}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {pack.credits} songs
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
                {pack.credits} personalized songs
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                Your baby&apos;s name in lyrics
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                MP3 download
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                Shareable link
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                Credits never expire
              </li>
            </ul>

            <Link
              href="/auth/signup"
              className={`py-2.5 rounded-lg text-sm font-medium text-center transition-colors ${
                pack.popular
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border hover:bg-muted"
              }`}
            >
              Buy {pack.credits} Credits
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
