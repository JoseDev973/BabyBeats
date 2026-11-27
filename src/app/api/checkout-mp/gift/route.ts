import { NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { getMercadoPago, GIFT_PACKS_COP } from "@/lib/mercado-pago/config";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateUnpaidGift } from "@/lib/gifts";
import { getAppUrl } from "@/lib/utils";
import { purchaseReturnParams } from "@/lib/analytics";
import { metaContextFromRequest } from "@/lib/meta-capi";

/**
 * Starts a Mercado Pago (COP) checkout for a gift album.
 * Body: { packType } or { giftId }. Returns { giftId, url }.
 * The gift is marked paid only by /api/webhooks/mercado-pago.
 */
export async function POST(request: Request) {
  if (!process.env.MP_ACCESS_TOKEN) {
    console.error("[checkout-mp/gift] MP_ACCESS_TOKEN not configured");
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
  const pack = GIFT_PACKS_COP[gift.pack_type];
  const appUrl = getAppUrl();
  const returnUrl = `${appUrl}/gift/create/${gift.id}`;

  try {
    const preference = await new Preference(getMercadoPago()).create({
      body: {
        items: [
          {
            id: `gift_${gift.pack_type}`,
            title: `BabyBeats — ${pack.name} (${pack.songs} canciones)`,
            quantity: 1,
            unit_price: pack.price,
            currency_id: "COP",
          },
        ],
        // Copied by Mercado Pago to payment.metadata; read by the webhook for Meta CAPI.
        metadata: metaContextFromRequest(request),
        external_reference: JSON.stringify({
          type: "gift",
          gift_id: gift.id,
          user_id: user.id,
        }),
        back_urls: {
          success: `${returnUrl}?payment=success&${purchaseReturnParams(`gift_${gift.pack_type}`, pack.price, "COP")}`,
          failure: `${returnUrl}?payment=failure`,
          pending: `${returnUrl}?payment=pending`,
        },
        auto_return: "approved",
        notification_url: `${appUrl}/api/webhooks/mercado-pago`,
      },
    });

    if (!preference.init_point) {
      console.error("[checkout-mp/gift] No init_point in preference response");
      return NextResponse.json({ error: "Failed to create payment link" }, { status: 502 });
    }

    return NextResponse.json({ giftId: gift.id, url: preference.init_point });
  } catch (err) {
    console.error("[checkout-mp/gift] Mercado Pago error:", err);
    return NextResponse.json({ error: "Payment service error" }, { status: 502 });
  }
}
