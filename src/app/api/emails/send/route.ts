import { resend, FROM_ADDRESS } from "@/lib/resend";
import { giftReadyEmail, getGiftReadySubject } from "@/lib/emails/gift-ready";
import { welcomeEmail, getWelcomeSubject } from "@/lib/emails/welcome";
import { createClient } from "@/lib/supabase/server";

type EmailType = "gift-ready" | "welcome";

export async function POST(request: Request) {
  try {
    // Verify internal API key to prevent unauthorized access
    const authHeader = request.headers.get("x-api-key");
    if (authHeader !== process.env.INTERNAL_API_KEY) {
      // Fallback: verify the caller is an authenticated user
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { type, to, lang = "es", data } = body as {
      type: EmailType;
      to: string;
      lang: "es" | "en";
      data: Record<string, unknown>;
    };

    if (!type || !to) {
      return Response.json(
        { error: "Missing required fields: type, to" },
        { status: 400 }
      );
    }

    let subject: string;
    let html: string;

    switch (type) {
      case "gift-ready": {
        const { childName, totalSongs, deliveryUrl } = data as {
          childName: string;
          totalSongs: number;
          deliveryUrl: string;
        };
        if (!childName || !totalSongs || !deliveryUrl) {
          return Response.json(
            { error: "Missing data fields for gift-ready email" },
            { status: 400 }
          );
        }
        subject = getGiftReadySubject(childName, lang);
        html = giftReadyEmail({ childName, totalSongs, deliveryUrl, lang });
        break;
      }

      case "welcome": {
        const { displayName } = data as { displayName: string | null };
        subject = getWelcomeSubject(lang);
        html = welcomeEmail({ displayName: displayName ?? null, lang });
        break;
      }

      default:
        return Response.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        );
    }

    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });

    return Response.json({ success: true, id: result.data?.id });
  } catch (error) {
    console.error("Email send error:", error);
    return Response.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
