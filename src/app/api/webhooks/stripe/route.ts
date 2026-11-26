import { NextResponse } from "next/server";
import { getStripe, CREDIT_PACKS } from "@/lib/stripe/config";
import { GIFT_PACKS_USD } from "@/lib/stripe/credit-packs";
import { isGiftPack } from "@/lib/mercado-pago/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Stripe from "stripe";

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
        const packKey = session.metadata?.pack as keyof typeof CREDIT_PACKS | undefined;
        const pack = packKey ? CREDIT_PACKS[packKey] : undefined;

        // Idempotency: Stripe retries webhooks
        const { data: existing } = await getSupabaseAdmin()
          .from("credit_transactions")
          .select("id")
          .eq("stripe_payment_id", session.id)
          .maybeSingle();

        if (pack && !existing) {
          // Atomic credit addition
          const { data: profile } = await getSupabaseAdmin()
            .from("profiles")
            .select("credits")
            .eq("id", userId)
            .single();

          const currentCredits = profile?.credits ?? 0;

          await getSupabaseAdmin()
            .from("profiles")
            .update({ credits: currentCredits + pack.credits })
            .eq("id", userId);

          await getSupabaseAdmin()
            .from("credit_transactions")
            .insert({
              user_id: userId,
              amount: pack.credits,
              type: "purchase",
              description: `Purchased ${pack.name} (${pack.credits} credits)`,
              stripe_payment_id: session.id,
            });
        }
        break;
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
  const { data: gift } = await admin
    .from("gifts")
    .select("id, pack_type, paid_at")
    .eq("id", giftId)
    .eq("buyer_id", userId)
    .maybeSingle();

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

  const { error } = await admin
    .from("gifts")
    .update({
      paid_at: new Date().toISOString(),
      stripe_payment_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gift.id)
    .is("paid_at", null);

  if (error) {
    console.error(`[Stripe Webhook] Failed to mark gift ${gift.id} paid:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
