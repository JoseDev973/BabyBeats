import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function Footer() {
  const t = useTranslations("common");
  const n = useTranslations("newWeb");

  return (
    <footer className="mt-auto bg-muted border-t border-border">
      <div className="max-w-[1160px] mx-auto px-5 py-10 grid gap-6 sm:grid-cols-[1fr_auto] items-start">
        <div className="grid gap-2">
          <Link href="/" className="inline-flex items-center gap-2 font-heading text-xl font-black tracking-tight">
            <svg viewBox="0 0 28 20" aria-hidden="true" className="h-5 w-7 stroke-[#8B7EC8] fill-[#FBBF8E]">
              <path d="M2 14c4-8 8-8 12 0s8 8 12 0" fill="none" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="8" cy="9" r="2.2" />
              <circle cx="20" cy="15" r="2.2" />
            </svg>
            BabyBeats
          </Link>
          <p className="text-sm text-muted-foreground max-w-sm">{n("footerNote")}</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <Link href="/songs" className="hover:underline underline-offset-4">{n("navSongs")}</Link>
          <Link href="/pricing" className="hover:underline underline-offset-4">{n("navPricing")}</Link>
          <Link href="/gift" className="hover:underline underline-offset-4">{n("navGift")}</Link>
          <Link href="/terms" className="hover:underline underline-offset-4">{t("terms")}</Link>
          <Link href="/privacy" className="hover:underline underline-offset-4">{t("privacy")}</Link>
        </nav>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          &copy; {new Date().getFullYear()} BabyBeats. {t("allRights")}
        </p>
      </div>
    </footer>
  );
}
