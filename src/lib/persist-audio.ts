import { getSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "songs";

/**
 * Suno's audio/image URLs are temporary (they 404 after ~2 weeks).
 * Copy the file into our public Supabase Storage bucket and return its
 * permanent URL. Returns the original URL if the copy fails, so a storage
 * hiccup never loses a song that is still reachable.
 */
export async function persistFromUrl(
  url: string | null | undefined,
  path: string,
): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const contentType = res.headers.get("content-type") ?? (path.endsWith(".mp3") ? "audio/mpeg" : "image/jpeg");
    const body = new Uint8Array(await res.arrayBuffer());

    const storage = getSupabaseAdmin().storage.from(BUCKET);
    const { error } = await storage.upload(path, body, { contentType, upsert: true });
    if (error) throw error;

    return storage.getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.error(`[persist-audio] Could not persist ${path}:`, err);
    return url;
  }
}

export function extOf(url: string | null | undefined, fallback: string) {
  const m = url?.match(/\.(mp3|jpe?g|png|webp)(?:\?|$)/i);
  return m ? m[1].toLowerCase() : fallback;
}
