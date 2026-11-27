import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyUnsubscribe } from "@/lib/lifecycle";

async function optOut(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(userId) || !verifyUnsubscribe(userId, token)) return false;
  await getSupabaseAdmin().from("profiles").update({ marketing_opt_out: true }).eq("id", userId).throwOnError();
  return true;
}

/** One-click unsubscribe from mail clients (RFC 8058). */
export async function POST(request: Request) {
  return new Response(null, { status: (await optOut(request)) ? 200 : 400 });
}

/** The link in the email footer. */
export async function GET(request: Request) {
  const ok = await optOut(request);
  const body = ok
    ? "<h1>Listo, no te enviaremos más correos como ese.</h1><p>Seguirás recibiendo los avisos de tus canciones y regalos.</p><p>Done — we won't send you emails like that again.</p>"
    : "<h1>Este enlace no es válido.</h1><p>Escríbenos a hola@babybeats.art y te ayudamos.</p>";
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BabyBeats</title></head><body style="margin:0;padding:48px 24px;background:#FFF8F0;color:#2E2350;font-family:Nunito,Arial,sans-serif;text-align:center">${body}<p><a href="https://babybeats.art" style="color:#5B4CA8">babybeats.art</a></p></body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
