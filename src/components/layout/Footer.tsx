import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Music } from "lucide-react";

export default function Footer() {
  const t = useTranslations("common");

  return (
    <footer className="border-t border-border py-8 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <span className="font-semibold">{t("appName")}</span>
        </Link>
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} BabyBeats. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
