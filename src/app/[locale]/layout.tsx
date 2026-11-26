import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { PlayerProvider } from "@/hooks/usePlayer";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AudioPlayer from "@/components/player/AudioPlayer";
import { Analytics } from "@vercel/analytics/react";
import "../globals.css";

const BASE_URL = "https://babybeats.art";

// Self-hosted (variable, latin subset): next/font/google intermittently
// failed Vercel builds with "queries have exactly one entry".
const nunito = localFont({
  src: "../fonts/nunito-latin.woff2",
  variable: "--font-nunito",
  weight: "400 800",
  display: "swap",
});

const quicksand = localFont({
  src: "../fonts/quicksand-latin.woff2",
  variable: "--font-quicksand",
  weight: "400 700",
  display: "swap",
});

const OG_LOCALE_MAP: Record<string, string> = {
  es: "es_CO",
  en: "en_US",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const title = t("defaultTitle");
  const description = t("defaultDescription");
  const ogDescription = t("ogDescription");
  const canonicalUrl = `${BASE_URL}/${locale}`;

  const alternateLanguages: Record<string, string> = {};
  for (const loc of routing.locales) {
    alternateLanguages[loc] = `${BASE_URL}/${loc}`;
  }

  return {
    title: {
      default: title,
      template: `%s | BabyBeats`,
    },
    description,
    icons: {
      icon: "/icon.svg",
    },
    keywords: [
      "baby songs",
      "AI music",
      "lullabies",
      "children music",
      "baby lullaby",
      "canciones para bebés",
      "música para bebés",
    ],
    alternates: {
      canonical: canonicalUrl,
      languages: alternateLanguages,
    },
    openGraph: {
      title,
      description: ogDescription,
      url: canonicalUrl,
      siteName: "BabyBeats",
      locale: OG_LOCALE_MAP[locale] ?? locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: ogDescription,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = (await import(`../../../messages/${locale}.json`)).default;

  return (
    <html
      lang={locale}
      className={`${nunito.variable} ${quicksand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>
          <PlayerProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <AudioPlayer />
          </PlayerProvider>
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
