import { rateLimit } from "@/lib/rate-limit";
import { FROM_ADDRESS, FROM_EMAIL, getResend } from "@/lib/resend";
import { SUPPORT_EMAIL_MAX_LENGTH, SUPPORT_MESSAGE_MAX_LENGTH } from "@/lib/support-limits";

// A single address, using the same syntax as the browser's email input.
const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!emailPattern.test(email) || email.length > SUPPORT_EMAIL_MAX_LENGTH ||
      !message || message.length > SUPPORT_MESSAGE_MAX_LENGTH) {
    return new Response(null, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anonymous";
  if (!rateLimit(`support:${ip}`, 5, 10 * 60_000).success) {
    return new Response(null, { status: 429 });
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_ADDRESS,
      to: FROM_EMAIL,
      replyTo: email,
      subject: "Consulta de ayuda · BabyBeats",
      text: `Correo de respuesta: ${email}\n\n${message}`,
    });

    if (!error && data?.id) return new Response(null, { status: 204 });
    console.error("Support email rejected", error?.name);
  } catch {
    console.error("Support email service unavailable");
  }
  return new Response(null, { status: 502 });
}
