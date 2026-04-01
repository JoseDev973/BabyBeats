import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if this is a new user (first login) and send welcome email
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("total_songs_generated, preferred_language")
            .eq("id", user.id)
            .single();

          // New user: no songs generated yet and profile was just created
          const isNewUser = (profile?.total_songs_generated ?? 0) === 0;
          const createdAt = new Date(user.created_at);
          const now = new Date();
          const minutesSinceCreation =
            (now.getTime() - createdAt.getTime()) / 1000 / 60;

          // Only send welcome email if user was created within the last 10 minutes
          if (isNewUser && minutesSinceCreation < 10) {
            const lang = profile?.preferred_language === "en" ? "en" : "es";
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

            fetch(`${appUrl}/api/emails/send`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.INTERNAL_API_KEY || "",
              },
              body: JSON.stringify({
                type: "welcome",
                to: user.email,
                lang,
                data: {
                  displayName:
                    user.user_metadata?.display_name ||
                    user.user_metadata?.full_name ||
                    null,
                },
              }),
            }).catch((err) => {
              console.error("[Auth Callback] Failed to send welcome email:", err);
            });
          }
        }
      } catch (err) {
        // Don't block the redirect if welcome email fails
        console.error("[Auth Callback] Welcome email check failed:", err);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
