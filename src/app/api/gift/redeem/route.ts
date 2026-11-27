import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GIFT_PACKS_COP, isGiftPack } from "@/lib/mercado-pago/config";

const EXPIRY_DAYS = 90;

async function findRedeemableGift(code: string) {
  const { data: gift } = await getSupabaseAdmin()
    .from("gifts")
    .select("id, child_name, pack_type, status, paid_at, created_at, gift_songs(count)")
    .eq("delivery_token", code)
    .eq("delivery_mode", "redeem")
    .maybeSingle();

  if (!gift || gift.gift_songs[0]?.count !== 0 || !gift.paid_at || !isGiftPack(gift.pack_type)) return null;
  return gift;
}

function isExpired(createdAt: string) {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  return days > EXPIRY_DAYS;
}

/** Public lookup for the /gift/redeem/[code] page. Returns only display info. */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const gift = await findRedeemableGift(code);
  if (!gift || !["ready", "delivered"].includes(gift.status) || isExpired(gift.created_at)) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: gift.id,
    child_name: gift.child_name,
    pack_type: gift.pack_type,
    total_songs: GIFT_PACKS_COP[gift.pack_type as keyof typeof GIFT_PACKS_COP].songs,
    status: gift.status,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { code } = await request.json().catch(() => ({}));

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const gift = await findRedeemableGift(code);
  if (!gift) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }

  const credits = GIFT_PACKS_COP[gift.pack_type as keyof typeof GIFT_PACKS_COP].songs;
  const { data: redeemed, error } = await getSupabaseAdmin().rpc("redeem_paid_gift", {
    p_gift_id: gift.id,
    p_user_id: user.id,
    p_credits: credits,
  });
  if (error) {
    console.error("[gift/redeem] Could not apply gift credits", error.code);
    return NextResponse.json({ error: "Failed to add credits" }, { status: 500 });
  }
  if (!redeemed) {
    return NextResponse.json({ error: "Gift is unavailable" }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    credits,
    childName: gift.child_name,
    packType: gift.pack_type,
    totalSongs: credits,
  });
}
