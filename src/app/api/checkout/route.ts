import { NextResponse } from "next/server";
import { getStripe, CREDIT_PACKS } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";

type PackKey = keyof typeof CREDIT_PACKS;

async function createCheckoutSession(
  request: Request,
  userId: string,
  email: string | undefined,
  pack: PackKey,
) {
  const selectedPack = CREDIT_PACKS[pack];
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;

    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    line_items: [{
      price_data: {
        currency: "usd",
        unit_amount: Math.round(selectedPack.price * 100),
        product_data: {
          name: `BabyBeats ${selectedPack.name}`,
          description: `${selectedPack.credits} personalized songs`,
        },
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    metadata: { supabase_user_id: userId, pack },
  });

  return NextResponse.redirect(session.url!);
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

  return createCheckoutSession(request, user.id, user.email, pack);
}

// POST kept for backwards compatibility
export async function POST(request: Request) {
  const { pack } = await request.json() as { pack: PackKey };

  if (!pack || !(pack in CREDIT_PACKS)) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return createCheckoutSession(request, user.id, user.email, pack);
}
