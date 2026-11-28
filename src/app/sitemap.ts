import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const BASE = "https://babybeats.art";
const PAGES = ["", "/pricing", "/gift", "/songs", "/terms", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routing.locales.flatMap((locale) =>
    PAGES.map((page) => ({
      url: `${BASE}/${locale}${page}`,
      changeFrequency: "weekly" as const,
      priority: page === "" ? 1 : 0.6,
    })),
  );
}
