import { test, expect } from "@playwright/test";
import { mock } from "node:test";
import { createHmac } from "node:crypto";
import { Payment } from "mercadopago";
import Stripe from "stripe";
import { POST as stripeWebhook } from "../src/app/api/webhooks/stripe/route";
import { POST as mercadoPagoWebhook } from "../src/app/api/webhooks/mercado-pago/route";

test("credit purchases wait for payment and ask for redelivery on database failure", async () => {
  // All SDK calls are local fixtures. Signed test events still use the production handlers.
  const signingSecret = "fixture-signing-secret";
  const buyer = "00000000-0000-4000-8000-000000000001";
  const appUrl = "http://127.0.0.1";
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: appUrl, SUPABASE_SERVICE_ROLE_KEY: "fixture",
    STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: signingSecret,
    MP_ACCESS_TOKEN: "fixture", MP_WEBHOOK_SECRET: signingSecret,
  };
  const original = { ...process.env };
  Object.assign(process.env, env);
  let databaseUnavailable = true;
  const receipts: { p_provider: string; p_payment_id: string; p_user_id: string; p_credits: number }[] = [];
  const database = mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init: RequestInit) => {
    expect(String(input)).toBe(appUrl + "/rest/v1/rpc/settle_credit_purchase");
    receipts.push(JSON.parse(String(init.body)));
    return databaseUnavailable
      ? Response.json({ code: "fixture", message: "unavailable" }, { status: 500 })
      : Response.json(true);
  });
  let mpAmount = 15000;
  const fetchPayment = mock.method(Payment.prototype, "get", async () => ({
    id: 42, status: "approved", currency_id: "COP", transaction_amount: mpAmount,
    external_reference: JSON.stringify({ user_id: buyer, pack: "starter" }),
  }));
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  function postStripe(type: string, status: string, total = 499) {
    const payload = JSON.stringify({ type, data: { object: {
      id: "cs_test", mode: "payment", payment_status: status, currency: "usd", amount_total: total,
      metadata: { supabase_user_id: buyer, pack: "starter" },
    } } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: signingSecret });
    return stripeWebhook(new Request(appUrl, {
      method: "POST", headers: { "stripe-signature": signature }, body: payload,
    }));
  }
  function postMp() {
    const ts = "1", requestId = "fixture";
    const signature = createHmac("sha256", signingSecret).update(`id:42;request-id:${requestId};ts:${ts};`).digest("hex");
    return mercadoPagoWebhook(new Request(appUrl + "/?data.id=42", {
      method: "POST", headers: { "x-signature": `ts=${ts},v1=${signature}`, "x-request-id": requestId },
      body: JSON.stringify({ type: "payment", data: { id: "42" } }),
    }));
  }
  try {
    expect((await postStripe("checkout.session.completed", "unpaid")).status).toBe(200);
    expect((await postStripe("checkout.session.completed", "paid", 100)).status).toBe(200);
    mpAmount = 100;
    expect((await postMp()).status).toBe(200);
    expect(receipts).toHaveLength(0);
    mpAmount = 15000;

    expect((await postStripe("checkout.session.async_payment_succeeded", "paid")).status).toBe(500);
    expect((await postMp()).status).toBe(500);
    databaseUnavailable = false;
    expect((await postStripe("checkout.session.async_payment_succeeded", "paid")).status).toBe(200);
    expect((await postMp()).status).toBe(200);
    expect(receipts.map(r => [r.p_provider, r.p_payment_id, r.p_user_id, r.p_credits])).toEqual([
      ["stripe", "cs_test", buyer, 3], ["mercado_pago", "42", buyer, 3],
      ["stripe", "cs_test", buyer, 3], ["mercado_pago", "42", buyer, 3],
    ]);
  } finally {
    fetchPayment.mock.restore();
    database.mock.restore();
    for (const key of Object.keys(env)) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
