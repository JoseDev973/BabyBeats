import { NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { createHmac } from "crypto";
import {
  getMercadoPago,
  CREDIT_PACKS_COP,
  CreditPackKey,
  GIFT_PACKS_COP,
  isGiftPack,
} from "@/lib/mercado-pago/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function verifySignature(request: Request, body: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // Skip in dev if not configured

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  const { searchParams } = new URL(request.url);
  const dataId = searchParams.get("data.id");

  if (!xSignature) return false;

  const parts = xSignature.split(",");
  const tsEntry = parts.find((p) => p.startsWith("ts="));
  const v1Entry = parts.find((p) => p.startsWith("v1="));

  if (!tsEntry || !v1Entry) return false;

  const ts = tsEntry.split("=")[1];
  const v1 = v1Entry.split("=")[1];

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  return expected === v1;
}

export async function POST(request: Request) {
  const body = await request.text();

  if (!verifySignature(request, body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let notification: { type?: string; data?: { id?: string } };
  try {
    notification = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // MP sends different notification types; we only handle payments
  if (notification.type !== "payment" || !notification.data?.id) {
    return NextResponse.json({ received: true });
  }

  const paymentId = notification.data.id;

  let payment;
  try {
    payment = await new Payment(getMercadoPago()).get({ id: paymentId });
  } catch {
    return NextResponse.json({ error: "Could not fetch payment" }, { status: 500 });
  }

  if (payment.status !== "approved") {
    return NextResponse.json({ received: true });
  }

  // external_reference stores { user_id, pack } (credits) or
  // { type: "gift", gift_id, user_id } (gift albums) as JSON
  let ref: { type?: string; user_id?: string; pack?: string; gift_id?: string };
  try {
    ref = JSON.parse(payment.external_reference ?? "{}");
  } catch {
    return NextResponse.json({ error: "Invalid external_reference" }, { status: 400 });
  }

  if (ref.type === "gift") {
    return handleGiftPayment(ref, payment, String(paymentId));
  }

  const { user_id: userId, pack } = ref;

  if (!userId || !pack || !(pack in CREDIT_PACKS_COP)) {
    return NextResponse.json({ error: "Missing reference data" }, { status: 400 });
  }

  const selectedPack = CREDIT_PACKS_COP[pack as CreditPackKey];
  const supabaseAdmin = getSupabaseAdmin();

  // Idempotency: skip if this payment was already processed
  const { data: existing } = await supabaseAdmin
    .from("credit_transactions")
    .select("id")
    .eq("mp_payment_id", String(paymentId))
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  // Add credits atomically
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  const currentCredits = profile?.credits ?? 0;

  await supabaseAdmin
    .from("profiles")
    .update({ credits: currentCredits + selectedPack.credits })
    .eq("id", userId);

  try {
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: userId,
      amount: selectedPack.credits,
      type: "purchase",
      description: `Purchased ${selectedPack.name} (${selectedPack.credits} credits) via Mercado Pago`,
      mp_payment_id: String(paymentId),
    });
  } catch (insertErr) {
    // Handle duplicate key gracefully (unique constraint on mp_payment_id)
    const errMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
    if (errMsg.includes("duplicate") || errMsg.includes("unique")) {
      return NextResponse.json({ received: true });
    }
    throw insertErr;
  }

  return NextResponse.json({ received: true });
}

async function handleGiftPayment(
  ref: { gift_id?: string; user_id?: string },
  payment: { transaction_amount?: number; currency_id?: string },
  paymentId: string,
) {
  if (!ref.gift_id || !ref.user_id) {
    return NextResponse.json({ error: "Missing reference data" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: gift } = await supabaseAdmin
    .from("gifts")
    .select("id, pack_type, paid_at")
    .eq("id", ref.gift_id)
    .eq("buyer_id", ref.user_id)
    .maybeSingle();

  if (!gift || !isGiftPack(gift.pack_type)) {
    console.error(`[MP Webhook] Gift payment ${paymentId} for unknown gift ${ref.gift_id}`);
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }

  // Idempotent: MP retries notifications
  if (gift.paid_at) {
    return NextResponse.json({ received: true });
  }

  const expected = GIFT_PACKS_COP[gift.pack_type].price;
  if (payment.currency_id !== "COP" || (payment.transaction_amount ?? 0) < expected) {
    console.error(
      `[MP Webhook] Gift payment ${paymentId} amount mismatch: got ${payment.transaction_amount} ${payment.currency_id}, expected ${expected} COP`,
    );
    return NextResponse.json({ received: true });
  }

  const { error } = await supabaseAdmin
    .from("gifts")
    .update({
      paid_at: new Date().toISOString(),
      mp_payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gift.id)
    .is("paid_at", null);

  if (error) {
    console.error(`[MP Webhook] Failed to mark gift ${gift.id} paid:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
