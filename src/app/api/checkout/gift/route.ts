import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/config";
import { GIFT_PACKS_USD } from "@/lib/stripe/credit-packs";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateUnpaidGift } from "@/lib/gifts";
import { getAppUrl } from "@/lib/utils";

/**
 * Starts a Stripe (USD) checkout for a gift album.
 * Body: { packType } or { giftId }. Returns { giftId, url }.
 * The gift is marked paid only by /api/webhooks/stripe.
 */
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_")) {
    console.error("[checkout/gift] STRIPE_SECRET_KEY not configured");
    return NextResponse.json({ error: "Payment service not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await getOrCreateUnpaidGift(user.id, await request.json().catch(() => ({})));
  if (!result.ok) {
    return NextResponse.json({ error: result.error, giftId: result.giftId }, { status: result.status });
  }

  const { gift } = result;
  const pack = GIFT_PACKS_USD[gift.pack_type];
  const returnUrl = `${getAppUrl()}/gift/create/${gift.id}`;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(pack.price * 100),
            product_data: {
              name: `BabyBeats — ${pack.name}`,
              description: `${pack.songs} personalized songs (gift album)`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${returnUrl}?payment=success`,
      cancel_url: `${returnUrl}?payment=failure`,
      metadata: { type: "gift", gift_id: gift.id, supabase_user_id: user.id },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create payment link" }, { status: 502 });
    }

    return NextResponse.json({ giftId: gift.id, url: session.url });
  } catch (err) {
    console.error("[checkout/gift] Stripe error:", err);
    return NextResponse.json({ error: "Payment service error" }, { status: 502 });
  }
}
