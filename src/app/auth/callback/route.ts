import { authReturnPath } from "@/lib/auth-return";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResend, FROM_ADDRESS } from "@/lib/resend";
import { welcomeEmail, getWelcomeSubject } from "@/lib/emails/welcome";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = authReturnPath(searchParams.get("next"), "");
  const locale = next.split("/")[1];
  const loginPath = hasLocale(routing.locales, locale) ? `/${locale}/auth/login` : "/auth/login";

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
            // Lets the browser report the sign-up to GA4/Meta (see MetaPixel).
            const method = user.app_metadata?.provider ?? "email";
            const withSignup = new URL(next, origin);
            withSignup.searchParams.set("px_signup", method);
            next = withSignup.pathname + withSignup.search + withSignup.hash;
            const lang = profile?.preferred_language === "en" ? "en" : "es";
            const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || null;
            const { error } = await getResend().emails.send({
              from: FROM_ADDRESS,
              to: user.email!,
              subject: getWelcomeSubject(lang),
              html: welcomeEmail({ displayName, lang }),
            });
            if (error) console.error("[Auth Callback] Failed to send welcome email:", error);
          }
        }
      } catch (err) {
        // Don't block the redirect if welcome email fails
        console.error("[Auth Callback] Welcome email check failed:", err);
      }

      return new NextResponse(null, { status: 303, headers: { Location: next } });
    }
  }

  const login = new URL(loginPath, origin);
  login.searchParams.set("error", "auth_failed");
  login.searchParams.set("next", next);
  return new NextResponse(null, { status: 303, headers: { Location: login.pathname + login.search } });
}
