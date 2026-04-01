import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

function generateReferralCode(displayName: string | null): string {
  const prefix = (displayName || "BABY")
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 4)
    .toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

export async function GET(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const { success, remaining } = rateLimit(ip);
    if (!success) {
      return Response.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get all referrals for this user
    const { data: referrals, error } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id);

    if (error) {
      console.error("Referrals fetch error:", error);
      return Response.json(
        { error: "Failed to fetch referrals" },
        { status: 500 }
      );
    }

    // Find the user's referral code (from any of their referrals, or indicate none yet)
    const referralCode = referrals?.[0]?.referral_code ?? null;

    const totalReferrals = referrals?.length ?? 0;
    const completed =
      referrals?.filter((r) => r.status === "completed" || r.status === "rewarded")
        .length ?? 0;
    const creditsEarned =
      referrals
        ?.filter((r) => r.status === "rewarded")
        .reduce((sum, r) => sum + (r.reward_credits ?? 0), 0) ?? 0;

    return Response.json({
      referralCode,
      stats: {
        totalReferrals,
        completed,
        creditsEarned,
      },
      referrals: referrals ?? [],
    });
  } catch (error) {
    console.error("Referrals GET error:", error);
    return Response.json(
      { error: "Failed to fetch referrals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const { success, remaining } = rateLimit(ip);
    if (!success) {
      return Response.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { referredEmail } = body as { referredEmail?: string };

    // Get user's profile for display_name
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    // Check if user already has a referral code
    const { data: existingReferrals } = await supabase
      .from("referrals")
      .select("referral_code")
      .eq("referrer_id", user.id)
      .limit(1);

    const referralCode =
      existingReferrals?.[0]?.referral_code ??
      generateReferralCode(profile?.display_name ?? null);

    // If a referred email was provided, create a new referral entry
    if (referredEmail) {
      // Check if this email was already referred by this user
      const { data: existing } = await supabase
        .from("referrals")
        .select("id")
        .eq("referrer_id", user.id)
        .eq("referred_email", referredEmail.toLowerCase())
        .single();

      if (existing) {
        return Response.json(
          { error: "This email has already been referred by you" },
          { status: 400 }
        );
      }

      const { data: referral, error } = await supabase
        .from("referrals")
        .insert({
          referrer_id: user.id,
          referred_email: referredEmail.toLowerCase(),
          referral_code: referralCode,
          status: "pending",
          reward_credits: 1,
        })
        .select()
        .single();

      if (error) {
        console.error("Referral creation error:", error);
        return Response.json(
          { error: "Failed to create referral" },
          { status: 500 }
        );
      }

      return Response.json({ referralCode, referral });
    }

    // If no email provided, just return the referral code
    // Create a placeholder referral if none exist (so the code is stored)
    if (!existingReferrals?.length) {
      await supabase.from("referrals").insert({
        referrer_id: user.id,
        referred_email: null,
        referral_code: referralCode,
        status: "pending",
        reward_credits: 1,
      });
    }

    return Response.json({ referralCode });
  } catch (error) {
    console.error("Referrals POST error:", error);
    return Response.json(
      { error: "Failed to create referral" },
      { status: 500 }
    );
  }
}
