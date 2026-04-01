import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { code } = (await request.json()) as { code: string };

    if (!code) {
      return Response.json(
        { error: "Coupon code is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("is_active", true)
      .single();

    if (error || !coupon) {
      return Response.json(
        { valid: false, error: "Invalid coupon code" },
        { status: 404 }
      );
    }

    // Check if coupon has expired
    const now = new Date().toISOString();
    if (coupon.valid_from && now < coupon.valid_from) {
      return Response.json(
        { valid: false, error: "Coupon is not yet active" },
        { status: 400 }
      );
    }
    if (coupon.valid_until && now > coupon.valid_until) {
      return Response.json(
        { valid: false, error: "Coupon has expired" },
        { status: 400 }
      );
    }

    // Check if coupon has been maxed out
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      return Response.json(
        { valid: false, error: "Coupon has reached maximum uses" },
        { status: 400 }
      );
    }

    return Response.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discount_percent: coupon.discount_percent,
        discount_amount: coupon.discount_amount,
      },
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return Response.json(
      { error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
