import { runLifecycleEmails } from "@/lib/lifecycle";

export const maxDuration = 300;

/** Daily follow-up emails. Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }
  // Simulates until LIFECYCLE_EMAILS_ENABLED=true, so nothing goes out before the copy is approved
  const dryRun = process.env.LIFECYCLE_EMAILS_ENABLED !== "true" || new URL(request.url).searchParams.get("dry") === "1";
  const results = await runLifecycleEmails({ dryRun });
  return Response.json({ dryRun, count: results.length, results });
}
