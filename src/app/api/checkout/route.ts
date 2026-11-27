import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, CREDIT_PACKS } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/utils";

type PackKey = keyof typeof CREDIT_PACKS;

function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_"));
}

/**
 * Returns a Stripe customer that exists for the current API key.
 * A stored stripe_customer_id can be stale: customers created with a test
 * key (sk_test_) don't exist in live mode (and vice versa), and customers
 * can be deleted from the dashboard. Passing such an id to
 * checkout.sessions.create throws "No such customer" → 500.
 */
async function getValidCustomerId(
  userId: string,
  email: string | undefined,
  storedId: string | null | undefined,
) {
  const stripe = getStripe();

  if (storedId) {
    try {
      const existing = await stripe.customers.retrieve(storedId);
      if (!("deleted" in existing && existing.deleted)) return storedId;
    } catch (err) {
      if (!(err instanceof Stripe.errors.StripeInvalidRequestError && err.code === "resource_missing")) {
        throw err;
      }
      console.warn(`[checkout] Stale stripe_customer_id ${storedId} for user ${userId}; creating a new one`);
    }
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  await getSupabaseAdmin()
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  return customer.id;
}

async function createCheckoutUrl(userId: string, email: string | undefined, pack: PackKey) {
  const selectedPack = CREDIT_PACKS[pack];
  const amountCents = Math.round(selectedPack.price * 100);
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  const customerId = await getValidCustomerId(userId, email, profile?.stripe_customer_id);

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    line_items: [{
      price_data: {
        currency: "usd",
        unit_amount: amountCents,
        product_data: {
          name: `BabyBeats ${selectedPack.name}`,
          description: `${selectedPack.credits} personalized songs`,
        },
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${getAppUrl()}/profile?success=true`,
    cancel_url: `${getAppUrl()}/pricing?canceled=true`,
    metadata: { supabase_user_id: userId, pack, amount_usd_cents: String(amountCents) },
  });

  return session.url;
}

// Called from checkout page as GET /api/checkout?pack=starter
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pack = searchParams.get("pack") as PackKey | null;

  if (!pack || !(pack in CREDIT_PACKS)) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // This is a browser navigation: on failure send the user back to pricing
  // instead of showing a raw 500 page.
  const fallback = `${getAppUrl()}/pricing?canceled=true`;

  if (!isStripeConfigured()) {
    console.error("[checkout] STRIPE_SECRET_KEY not configured");
    return NextResponse.redirect(fallback);
  }

  try {
    const url = await createCheckoutUrl(user.id, user.email, pack);
    return NextResponse.redirect(url ?? fallback);
  } catch (err) {
    console.error("[checkout] Stripe error:", err);
    return NextResponse.redirect(fallback);
  }
}

// POST kept for backwards compatibility
export async function POST(request: Request) {
  const { pack } = await request.json().catch(() => ({})) as { pack?: PackKey };

  if (!pack || !(pack in CREDIT_PACKS)) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    console.error("[checkout] STRIPE_SECRET_KEY not configured");
    return NextResponse.json({ error: "Payment service not configured" }, { status: 503 });
  }

  try {
    const url = await createCheckoutUrl(user.id, user.email, pack);
    if (!url) {
      return NextResponse.json({ error: "Failed to create payment link" }, { status: 502 });
    }
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[checkout] Stripe error:", err);
    return NextResponse.json({ error: "Payment service error" }, { status: 502 });
  }
}
