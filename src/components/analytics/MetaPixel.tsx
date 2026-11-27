"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { META_PIXEL_ID, track } from "@/lib/analytics";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};

/**
 * Meta's standard base code as a function, minus the automatic PageView.
 * It runs from an effect (not a <Script afterInteractive>) so the queue exists
 * before the first PageView/Purchase below; calls are queued until
 * fbevents.js loads. Idempotent.
 */
function ensureFbq() {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  (window as unknown as { _fbq?: Fbq })._fbq ??= fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  fbq("init", META_PIXEL_ID);
}

/** Same stub as the Google tag snippet in the layout, so GA events aren't lost before it runs. */
function ensureGtag() {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  window.gtag ??= function () {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
}

const SENT_KEY = "bb_px_sent";

/** True the first time an id is seen in this browser; stops a reload from re-sending a purchase. */
function firstTime(id: string) {
  try {
    const sent: string[] = JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]");
    if (sent.includes(id)) return false;
    localStorage.setItem(SENT_KEY, JSON.stringify([...sent.slice(-49), id]));
  } catch {
    // Storage blocked: still send; Meta deduplicates by eventID.
  }
  return true;
}

/**
 * Reports conversions that arrive as URL params:
 * - purchase: ?px_item=&px_value=&px_currency=&px_ref= (set by our checkout success URLs;
 *   Mercado Pago adds payment_id and status itself)
 * - sign_up:  ?px_signup=google (set by /auth/callback for brand-new accounts)
 */
function reportUrlConversions() {
  const q = new URLSearchParams(window.location.search);

  const item = q.get("px_item");
  const value = Number(q.get("px_value"));
  const currency = q.get("px_currency");
  if (item && value > 0 && (currency === "USD" || currency === "COP")) {
    const mpStatus = q.get("collection_status") ?? q.get("status");
    const approved = currency === "USD" || mpStatus === "approved";
    const ref = q.get("px_ref") ?? q.get("payment_id");
    if (approved && ref && firstTime(`purchase:${ref}`)) {
      track("purchase", { item_id: item, value, currency }, ref);
    }
  }

  const signup = q.get("px_signup");
  if (signup && firstTime(`signup:${window.location.pathname}:${signup}:${new Date().toDateString()}`)) {
    track("sign_up", { method: signup });
  }
}

export function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    ensureFbq();
    ensureGtag();
    window.fbq?.("track", "PageView");
    reportUrlConversions();
  }, [pathname]);

  return null;
}
