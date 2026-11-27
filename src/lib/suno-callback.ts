import { createHmac, timingSafeEqual } from "node:crypto";

export type CallbackTarget = { kind: "song" | "gift"; id: string; attempt?: string };

function signature(target: CallbackTarget) {
  const secret = process.env.SUNO_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("SUNO_WEBHOOK_SECRET is not configured");
  const payload = target.attempt
    ? JSON.stringify(["v2", target.kind, target.id, target.attempt])
    : `${target.kind}/${target.id}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
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
  const attempt = url.searchParams.get("attempt");
  if (attempt !== null && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(attempt)) return null;
  const target: CallbackTarget = attempt ? { kind, id, attempt } : { kind, id };
  const expected = signature(target);
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? target : null;
}
