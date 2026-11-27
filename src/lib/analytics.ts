/** Google tag ID for babybeats.art (GA4 property "babybeats.art"). */
export const GOOGLE_TAG_ID = "GTM-W82SN52K";

/** Meta pixel (dataset "BabyBeats Web") in the BabyBeats business portfolio. */
export const META_PIXEL_ID = "4789256937969361";

type Params = Record<string, string | number>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/** GA4 event names → Meta standard events. Anything else goes as a custom event. */
const META_EVENTS: Record<string, string> = {
  begin_checkout: "InitiateCheckout",
  sign_up: "CompleteRegistration",
  purchase: "Purchase",
};

const META_CUSTOM_EVENTS: Record<string, string> = {
  generate_song: "GenerateSong",
};

/**
 * Send an event to GA4 and the Meta pixel. A no-op for any tag that hasn't
 * loaded (dev, previews, ad blockers). `eventId` lets Meta deduplicate the
 * same conversion if it is sent twice (e.g. later from the Conversions API).
 */
export function track(event: string, params: Params = {}, eventId?: string) {
  window.gtag?.("event", event, eventId ? { ...params, transaction_id: eventId } : params);

  const options = eventId ? { eventID: eventId } : undefined;
  if (META_EVENTS[event]) {
    window.fbq?.("track", META_EVENTS[event], toMetaParams(params), options);
  } else {
    window.fbq?.("trackCustom", META_CUSTOM_EVENTS[event] ?? event, toMetaParams(params), options);
  }
}

function toMetaParams(params: Params) {
  const { item_id, ...rest } = params;
  return item_id ? { ...rest, content_ids: [String(item_id)], content_type: "product" } : rest;
}

/**
 * Query params our checkouts append to their success URLs so the browser can
 * report the purchase: ?px_item=starter&px_value=4.99&px_currency=USD&px_ref=cs_...
 */
export function purchaseReturnParams(item: string, value: number, currency: "USD" | "COP", ref?: string) {
  const params = new URLSearchParams({ px_item: item, px_value: String(value), px_currency: currency });
  // Stripe replaces this literal placeholder with the session id on redirect.
  const refParam = ref ? `&px_ref=${ref}` : "";
  return `${params.toString()}${refParam}`;
}
