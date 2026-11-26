import { NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { getMercadoPago, GIFT_PACKS_COP, isGiftPack } from "@/lib/mercado-pago/config";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/utils";

/**
 * Starts a Mercado Pago checkout for a gift album.
 * Body: { packType } to create a new gift, or { giftId } to retry paying an
 * existing unpaid one. Returns { giftId, url } — the client redirects to url.
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

  const body = (await request.json().catch(() => ({}))) as {
    packType?: unknown;
    giftId?: unknown;
  };
  const admin = getSupabaseAdmin();

  let gift: { id: string; pack_type: string };

  if (typeof body.giftId === "string") {
    const { data } = await admin
      .from("gifts")
      .select("id, pack_type, paid_at")
      .eq("id", body.giftId)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }
    if (data.paid_at) {
      return NextResponse.json({ error: "ALREADY_PAID", giftId: data.id }, { status: 409 });
    }
    gift = data;
  } else if (isGiftPack(body.packType)) {
    const { data, error } = await admin
      .from("gifts")
      .insert({
        buyer_id: user.id,
        pack_type: body.packType,
        total_songs: GIFT_PACKS_COP[body.packType].songs,
        child_name: "—",
        status: "draft",
      })
      .select("id, pack_type")
      .single();

    if (error || !data) {
      console.error("[checkout-mp/gift] Failed to create gift:", error);
      return NextResponse.json({ error: "Could not create gift" }, { status: 500 });
    }
    gift = data;
  } else {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  if (!isGiftPack(gift.pack_type)) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

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
        external_reference: JSON.stringify({
          type: "gift",
          gift_id: gift.id,
          user_id: user.id,
        }),
        back_urls: {
          success: `${returnUrl}?payment=success`,
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
