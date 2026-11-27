// Older checkout and gift links use both localized and unprefixed return paths.
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

export function authReturnPath(value: string | null, locale: string) {
  const fallback = hasLocale(routing.locales, locale) ? `/${locale}` : "/";
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  const base = "https://babybeats.invalid";
  const url = new URL(value, base);
  if (url.origin !== base || url.pathname.startsWith("//")) return fallback;

  const first = url.pathname.split("/")[1];
  const prefix = hasLocale(routing.locales, first) ? "" : fallback.replace(/\/$/, "");
  return `${prefix}${url.pathname}${url.search}${url.hash}`;
}

export function authCallbackUrl(origin: string, next: string) {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", next);
  return url.toString();
}
