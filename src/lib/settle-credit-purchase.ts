import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function settleCreditPurchase(
  provider: "stripe" | "mercado_pago",
  paymentId: string,
  userId: string,
  pack: { name: string; credits: number },
) {
  const { error } = await getSupabaseAdmin().rpc("settle_credit_purchase", {
    p_provider: provider,
    p_payment_id: paymentId,
    p_user_id: userId,
    p_credits: pack.credits,
    p_description: `Purchased ${pack.name} (${pack.credits} credits)`,
  });
  if (error) {
    console.error(`[${provider}] Failed to apply credit purchase ${paymentId}`, error.code);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
