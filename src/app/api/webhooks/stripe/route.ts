import { NextResponse } from "next/server";
import { getStripe, CREDIT_PACKS } from "@/lib/stripe/config";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

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

      // Handle one-time credit pack purchase
      if (session.mode === "payment") {
        const packKey = session.metadata?.pack as keyof typeof CREDIT_PACKS | undefined;
        const pack = packKey ? CREDIT_PACKS[packKey] : undefined;

        if (pack) {
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
