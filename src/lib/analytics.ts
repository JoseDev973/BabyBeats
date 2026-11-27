/** Google tag ID for babybeats.art (GA4 property "babybeats.art"). */
export const GOOGLE_TAG_ID = "GTM-W82SN52K";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Send a GA4 event; a no-op when the tag hasn't loaded (dev, ad blockers). */
export function track(event: string, params: Record<string, string | number> = {}) {
  window.gtag?.("event", event, params);
}
