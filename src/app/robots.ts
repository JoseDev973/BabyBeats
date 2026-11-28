import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/profile", "/my-songs", "/create/generating/"] },
    sitemap: "https://babybeats.art/sitemap.xml",
  };
}
