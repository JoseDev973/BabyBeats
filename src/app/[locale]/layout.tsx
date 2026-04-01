import type { Metadata } from "next";
import { Nunito, Quicksand } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { PlayerProvider } from "@/hooks/usePlayer";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AudioPlayer from "@/components/player/AudioPlayer";
import "../globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "BabyBeats — AI-Crafted Songs for Babies",
    template: "%s | BabyBeats",
  },
  description:
    "Lullabies, educational songs, and fun tunes for your baby — crafted with artificial intelligence. Listen on Spotify, Apple Music, or our platform.",
  keywords: [
    "baby songs",
    "AI music",
    "lullabies",
    "children music",
    "baby lullaby",
    "canciones para bebés",
    "música para bebés",
  ],
};

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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
