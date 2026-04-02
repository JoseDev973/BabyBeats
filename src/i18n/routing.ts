import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["es", "en", "pt", "fr"],
  defaultLocale: "es",
});

export const LOCALE_LABELS: Record<string, string> = {
  es: "ES",
  en: "EN",
  pt: "PT",
  fr: "FR",
};

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
