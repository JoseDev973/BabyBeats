import { createHmac, timingSafeEqual } from "node:crypto";

export type CallbackTarget = { kind: "song" | "gift"; id: string };

function signature(target: CallbackTarget) {
  const secret = process.env.SUNO_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("SUNO_WEBHOOK_SECRET is not configured");
  return createHmac("sha256", secret).update(`${target.kind}/${target.id}`).digest("hex");
}

// The provider accepts a callback URL, but cannot attach our custom bearer header.
export function callbackUrl(appUrl: string, target: CallbackTarget) {
  const url = new URL("/api/webhooks/suno", appUrl);
  url.search = new URLSearchParams({ ...target, sig: signature(target) }).toString();
  return url.toString();
}

export function verifyCallback(url: URL): CallbackTarget | null {
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id");
  const sig = url.searchParams.get("sig");
  if ((kind !== "song" && kind !== "gift") || !id || !sig || !/^[0-9a-f]{64}$/.test(sig)) return null;
  const expected = signature({ kind, id });
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? { kind, id } : null;
}
