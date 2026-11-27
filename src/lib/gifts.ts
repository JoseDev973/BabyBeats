import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GIFT_PACKS_COP, isGiftPack, type GiftPackKey } from "@/lib/mercado-pago/config";

type Result =
  | { ok: true; gift: { id: string; pack_type: GiftPackKey } }
  | { ok: false; status: number; error: string; giftId?: string };

/**
 * Shared by the Stripe and Mercado Pago gift checkouts.
 * Body { packType } creates a new unpaid gift; { giftId } reuses an existing
 * unpaid gift owned by the user (retrying payment).
 */
export async function getOrCreateUnpaidGift(
  userId: string,
  body: { packType?: unknown; giftId?: unknown },
): Promise<Result> {
  const admin = getSupabaseAdmin();

  if (typeof body.giftId === "string") {
    const { data } = await admin
      .from("gifts")
      .select("id, pack_type, paid_at")
      .eq("id", body.giftId)
      .eq("buyer_id", userId)
      .maybeSingle();

    if (!data) return { ok: false, status: 404, error: "Gift not found" };
    if (data.paid_at) return { ok: false, status: 409, error: "ALREADY_PAID", giftId: data.id };
    if (!isGiftPack(data.pack_type)) return { ok: false, status: 400, error: "Invalid pack" };
    return { ok: true, gift: { id: data.id, pack_type: data.pack_type } };
  }

  if (!isGiftPack(body.packType)) {
    return { ok: false, status: 400, error: "Invalid pack" };
  }

  const { data, error } = await admin
    .from("gifts")
    .insert({
      buyer_id: userId,
      pack_type: body.packType,
      total_songs: GIFT_PACKS_COP[body.packType].songs,
      child_name: "—",
      delivery_mode: "link",
      delivery_token: crypto.randomUUID(),
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[gifts] Failed to create gift:", error);
    return { ok: false, status: 500, error: "Could not create gift" };
  }

  return { ok: true, gift: { id: data.id, pack_type: body.packType } };
}
