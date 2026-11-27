import { createHash } from "crypto";
import { META_PIXEL_ID } from "@/lib/analytics";
import { getAppUrl } from "@/lib/utils";

/**
 * Meta Conversions API: reports purchases from the payment webhooks, so they
 * count even when the browser pixel is blocked (ad blockers, iOS, closed tab).
 * Each purchase uses the same event_id as the browser Purchase (Stripe
 * session id / Mercado Pago payment id), so Meta counts it once.
 *
 * Env: META_CAPI_ACCESS_TOKEN (required, else this is a no-op),
 *      META_CAPI_TEST_EVENT_CODE (optional, routes events to "Probar eventos").
 */

const GRAPH_VERSION = "v25.0";

/** Browser identifiers captured when the checkout starts (the webhook has none). */
export type MetaBrowserContext = {
  meta_fbp?: string;
  meta_fbc?: string;
  meta_ip?: string;
  meta_ua?: string;
};

function readCookie(header: string | null, name: string) {
  const match = header?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Collects _fbp/_fbc cookies, IP and user agent from the checkout request. */
export function metaContextFromRequest(request: Request): MetaBrowserContext {
  const cookies = request.headers.get("cookie");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  // Stripe metadata values are capped at 500 characters.
  const ua = request.headers.get("user-agent")?.slice(0, 500);
  const ctx: MetaBrowserContext = {
    meta_fbp: readCookie(cookies, "_fbp"),
    meta_fbc: readCookie(cookies, "_fbc"),
    meta_ip: ip || undefined,
    meta_ua: ua || undefined,
  };
  return Object.fromEntries(Object.entries(ctx).filter(([, v]) => v)) as MetaBrowserContext;
}

const sha256 = (value: string) => createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

export type MetaPurchase = {
  eventId: string;
  value: number;
  currency: string;
  itemId: string;
  userId?: string;
  email?: string | null;
  context?: Record<string, unknown> | null;
};

/** Sends a Purchase to Meta. Never throws: a failure here must not fail the webhook. */
export async function sendMetaPurchase(purchase: MetaPurchase) {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) return;

  const ctx = (purchase.context ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

  const userData: Record<string, unknown> = {
    em: purchase.email ? [sha256(purchase.email)] : undefined,
    external_id: purchase.userId ? [sha256(purchase.userId)] : undefined,
    fbp: str(ctx.meta_fbp),
    fbc: str(ctx.meta_fbc),
    client_ip_address: str(ctx.meta_ip),
    client_user_agent: str(ctx.meta_ua),
  };

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: purchase.eventId,
        action_source: "website",
        event_source_url: getAppUrl(),
        user_data: Object.fromEntries(Object.entries(userData).filter(([, v]) => v)),
        custom_data: {
          value: purchase.value,
          currency: purchase.currency.toUpperCase(),
          content_ids: [purchase.itemId],
          content_type: "product",
        },
      },
    ],
  };
  if (process.env.META_CAPI_TEST_EVENT_CODE) body.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) {
      console.error(`[Meta CAPI] Purchase ${purchase.eventId} rejected: ${res.status} ${(await res.text()).slice(0, 300)}`);
    }
  } catch (err) {
    console.error(`[Meta CAPI] Purchase ${purchase.eventId} failed:`, err instanceof Error ? err.message : err);
  }
}
