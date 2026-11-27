import { NextResponse, after } from "next/server";
import { getStripe, CREDIT_PACKS } from "@/lib/stripe/config";
import { GIFT_PACKS_USD } from "@/lib/stripe/credit-packs";
import { isGiftPack } from "@/lib/mercado-pago/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { settleCreditPurchase } from "@/lib/settle-credit-purchase";
import { sendMetaPurchase } from "@/lib/meta-capi";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;

      if (!userId) break;

      if (session.mode === "payment" && session.payment_status !== "paid") break;

      if (session.metadata?.type === "gift") {
        return handleGiftPayment(session, userId);
      }

      // Handle one-time credit pack purchase
      if (session.mode === "payment") {
        const packKey = session.metadata?.pack;
        if (!packKey || !Object.hasOwn(CREDIT_PACKS, packKey)) break;
        const pack = CREDIT_PACKS[packKey as keyof typeof CREDIT_PACKS];
        const expectedCents = Number(session.metadata?.amount_usd_cents ?? Math.round(pack.price * 100));
        if (
          !Number.isSafeInteger(expectedCents) || expectedCents <= 0 ||
          session.currency !== "usd" || (session.amount_total ?? 0) < expectedCents
        ) {
          console.error(`[Stripe Webhook] Credit payment ${session.id} amount mismatch`);
          return NextResponse.json({ received: true });
        }
        return settleCreditPurchase("stripe", session.id, userId, pack, () =>
          after(() => sendMetaPurchase(stripePurchase(session, userId, packKey))),
        );
      }

      // Handle subscription (existing logic)
      if (session.subscription) {
        const subscription = await getStripe().subscriptions.retrieve(
          session.subscription as string,
        );

        const item = subscription.items.data[0];
        await getSupabaseAdmin().from("subscriptions").upsert({
          user_id: userId,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_start: item?.current_period_start
            ? new Date(item.current_period_start * 1000).toISOString()
            : null,
          current_period_end: item?.current_period_end
            ? new Date(item.current_period_end * 1000).toISOString()
            : null,
        });

        await getSupabaseAdmin()
          .from("profiles")
          .update({ subscription_tier: "premium" })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const { data: sub } = await getSupabaseAdmin()
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();

      if (sub) {
        const item = subscription.items.data[0];
        await getSupabaseAdmin()
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_start: item?.current_period_start
              ? new Date(item.current_period_start * 1000).toISOString()
              : null,
            current_period_end: item?.current_period_end
              ? new Date(item.current_period_end * 1000).toISOString()
              : null,
          })
          .eq("stripe_subscription_id", subscription.id);

        const tier =
          subscription.status === "active" ? "premium" : "free";
        await getSupabaseAdmin()
          .from("profiles")
          .update({ subscription_tier: tier })
          .eq("id", sub.user_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handleGiftPayment(session: Stripe.Checkout.Session, userId: string) {
  const giftId = session.metadata?.gift_id;
  if (!giftId) return NextResponse.json({ received: true });

  const admin = getSupabaseAdmin();
  const { data: gift, error: readError } = await admin
    .from("gifts")
    .select("id, pack_type, paid_at")
    .eq("id", giftId)
    .eq("buyer_id", userId)
    .maybeSingle();

  if (readError) return NextResponse.json({ error: "Database error" }, { status: 500 });
  if (!gift || !isGiftPack(gift.pack_type)) {
    console.error(`[Stripe Webhook] Gift payment ${session.id} for unknown gift ${giftId}`);
    return NextResponse.json({ received: true });
  }

  if (gift.paid_at) return NextResponse.json({ received: true });

  const expectedCents = Math.round(GIFT_PACKS_USD[gift.pack_type].price * 100);
  if (session.currency !== "usd" || (session.amount_total ?? 0) < expectedCents) {
    console.error(
      `[Stripe Webhook] Gift payment ${session.id} amount mismatch: ${session.amount_total} ${session.currency}`,
    );
    return NextResponse.json({ received: true });
  }

  const { data: updated, error } = await admin
    .from("gifts")
    .update({
      paid_at: new Date().toISOString(),
      stripe_payment_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gift.id)
    .is("paid_at", null)
    .select("id");

  if (error) {
    console.error(`[Stripe Webhook] Failed to mark gift ${gift.id} paid:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Only the delivery that actually marked the gift paid reports the purchase.
  if (updated?.length) {
    after(() => sendMetaPurchase(stripePurchase(session, userId, `gift_${gift.pack_type}`)));
  }

  return NextResponse.json({ received: true });
}

function stripePurchase(session: Stripe.Checkout.Session, userId: string, itemId: string) {
  return {
    eventId: session.id,
    value: (session.amount_total ?? 0) / 100,
    currency: session.currency ?? "usd",
    itemId,
    userId,
    email: session.customer_details?.email ?? session.customer_email,
    context: session.metadata,
  };
}
