import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Music } from "lucide-react";

export default function Footer() {
  const t = useTranslations("common");

  return (
    <footer className="border-t border-border py-12 px-4 mt-auto bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <Music className="h-5 w-5 text-primary" />
              <span className="font-bold text-lg">{t("appName")}</span>
            </Link>
            <p className="text-sm text-muted-foreground">{t("tagline")}</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm mb-3">{t("product")}</h4>
            <div className="space-y-2">
              <Link href="/create" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("createSong")}
              </Link>
              <Link href="/songs" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("catalog")}
              </Link>
              <Link href="/gift" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("giftAlbum")}
              </Link>
              <Link href="/pricing" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("pricing")}
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-3">{t("legal")}</h4>
            <div className="space-y-2">
              <Link href="/terms" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("terms")}
              </Link>
              <Link href="/privacy" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("privacy")}
              </Link>
              <a href="mailto:hello@babybeats.art" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("contact")}: hello@babybeats.art
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} BabyBeats. {t("allRights")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("madeWithLove")}
          </p>
        </div>
      </div>
    </footer>
  );
}
