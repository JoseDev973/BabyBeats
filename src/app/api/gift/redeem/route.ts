import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { code } = await request.json();

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  // Look up gift
  const { data: gift, error: fetchError } = await supabase
    .from("gifts")
    .select("id, child_name, total_songs, pack_type, status, delivery_mode")
    .eq("delivery_token", code)
    .eq("delivery_mode", "redeem")
    .single();

  if (fetchError || !gift) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }

  if (gift.status === "redeemed") {
    return NextResponse.json({ error: "Already redeemed" }, { status: 400 });
  }

  // Get current credits
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  const currentCredits = profile?.credits ?? 0;

  // Add credits
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ credits: currentCredits + gift.total_songs })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to add credits" }, { status: 500 });
  }

  // Record transaction
  await supabase.from("credit_transactions").insert({
    user_id: user.id,
    amount: gift.total_songs,
    type: "bonus",
    description: `Gift redeemed: ${gift.pack_type} for ${gift.child_name}`,
  });

  // Mark gift as redeemed
  await supabase
    .from("gifts")
    .update({ status: "redeemed", updated_at: new Date().toISOString() })
    .eq("id", gift.id);

  return NextResponse.json({
    success: true,
    credits: gift.total_songs,
    childName: gift.child_name,
    packType: gift.pack_type,
    totalSongs: gift.total_songs,
  });
}
