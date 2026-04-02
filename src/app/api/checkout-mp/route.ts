import { NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { getMercadoPago, CREDIT_PACKS_COP, CreditPackKey } from "@/lib/mercado-pago/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pack = searchParams.get("pack") as CreditPackKey | null;

  if (!pack || !(pack in CREDIT_PACKS_COP)) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/auth/login", request.url)
    );
  }

  const selectedPack = CREDIT_PACKS_COP[pack];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const preference = await new Preference(getMercadoPago()).create({
    body: {
      items: [
        {
          id: pack,
          title: `BabyBeats ${selectedPack.name} — ${selectedPack.credits} créditos`,
          quantity: 1,
          unit_price: selectedPack.price,
          currency_id: "COP",
        },
      ],
      external_reference: JSON.stringify({
        user_id: user.id,
        pack,
      }),
      back_urls: {
        success: `${appUrl}/profile?success=true`,
        failure: `${appUrl}/pricing?canceled=true`,
        pending: `${appUrl}/profile?pending=true`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/webhooks/mercado-pago`,
    },
  });

  return NextResponse.redirect(preference.init_point!);
}
