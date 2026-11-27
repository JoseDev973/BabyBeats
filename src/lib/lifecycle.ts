import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getResend, FROM_ADDRESS } from "@/lib/resend";
import { lifecycleEmail, type LifecycleKind } from "@/lib/emails/lifecycle";
import { appUrl, type EmailLang } from "@/lib/emails/layout";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Signed unsubscribe token so nobody can unsubscribe someone else. */
function sign(userId: string) {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(`unsub:${userId}`).digest("base64url");
}
export function unsubscribeUrl(userId: string) {
  return `${appUrl()}/api/email/unsubscribe?u=${userId}&t=${sign(userId)}`;
}
export function verifyUnsubscribe(userId: string, token: string) {
  const a = Buffer.from(sign(userId)), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Candidate = { userId: string; kind: LifecycleKind; ref: string; childName?: string | null; href?: string };

async function candidates(): Promise<Candidate[]> {
  const db = getSupabaseAdmin();
  const now = Date.now();
  const iso = (ms: number) => new Date(now - ms).toISOString();
  const out: Candidate[] = [];

  // 1. Gift checkout started 2h–3d ago and never paid
  const { data: gifts } = await db.from("gifts").select("id, buyer_id, child_name, language")
    .is("paid_at", null).lte("created_at", iso(2 * HOUR)).gte("created_at", iso(3 * DAY)).throwOnError();
  const paidBuyers = new Set((await db.from("gifts").select("buyer_id").not("paid_at", "is", null).throwOnError()).data!.map((g) => g.buyer_id));
  const seenBuyer = new Set<string>();
  for (const g of gifts ?? []) {
    if (!g.buyer_id || paidBuyers.has(g.buyer_id) || seenBuyer.has(g.buyer_id)) continue;
    seenBuyer.add(g.buyer_id);
    out.push({ userId: g.buyer_id, kind: "gift_abandoned", ref: g.id, childName: g.child_name === "—" ? null : g.child_name,
      href: `${appUrl()}/${g.language === "en" ? "en" : "es"}/gift/create/${g.id}` });
  }

  // 2. Signed up 1–4 days ago, no song yet
  const { data: idle } = await db.from("profiles").select("id")
    .eq("total_songs_generated", 0).lte("created_at", iso(DAY)).gte("created_at", iso(4 * DAY)).throwOnError();
  for (const p of idle ?? []) out.push({ userId: p.id, kind: "no_song", ref: "" });

  // 3. First song finished 2–7 days ago, never bought anything
  const { data: songs } = await db.from("generated_songs").select("user_id, child_name, created_at")
    .eq("status", "completed").gte("created_at", iso(7 * DAY)).order("created_at").throwOnError();
  const buyers = new Set((await db.from("credit_transactions").select("user_id").eq("type", "purchase").throwOnError()).data!.map((t) => t.user_id));
  const firstSong = new Map<string, { child_name: string; created_at: string }>();
  for (const s of songs ?? []) if (s.user_id && !firstSong.has(s.user_id)) firstSong.set(s.user_id, s);
  for (const [userId, s] of firstSong) {
    if (buyers.has(userId) || paidBuyers.has(userId)) continue;
    if (Date.parse(s.created_at) > now - 2 * DAY) continue;
    out.push({ userId, kind: "free_song_no_purchase", ref: "", childName: s.child_name });
  }
  return out;
}

/** Sends each pending follow-up once. `dryRun` returns what would be sent. */
export async function runLifecycleEmails({ dryRun = false } = {}) {
  const db = getSupabaseAdmin();
  const list = await candidates();
  const results: { kind: LifecycleKind; status: string }[] = [];

  for (const c of list) {
    const { data: profile } = await db.from("profiles").select("preferred_language, marketing_opt_out").eq("id", c.userId).maybeSingle();
    if (!profile || profile.marketing_opt_out) continue;
    const { data: already } = await db.from("lifecycle_emails").select("id").eq("user_id", c.userId).eq("kind", c.kind).eq("ref", c.ref).maybeSingle();
    if (already) continue;
    const { data: auth } = await db.auth.admin.getUserById(c.userId);
    const to = auth.user?.email;
    if (!to) continue;

    const lang: EmailLang = profile.preferred_language === "en" ? "en" : "es";
    const unsub = unsubscribeUrl(c.userId);
    const email = lifecycleEmail({ kind: c.kind, lang, childName: c.childName, href: c.href, unsubscribeUrl: unsub });
    if (dryRun) { results.push({ kind: c.kind, status: "would_send" }); continue; }

    // Claim first so a parallel run can't send it twice
    const { error: claimError } = await db.from("lifecycle_emails").insert({ user_id: c.userId, kind: c.kind, ref: c.ref });
    if (claimError) continue;
    const { error } = await getResend().emails.send({
      from: FROM_ADDRESS, to, subject: email.subject, html: email.html,
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (error) {
      await db.from("lifecycle_emails").delete().eq("user_id", c.userId).eq("kind", c.kind).eq("ref", c.ref);
      results.push({ kind: c.kind, status: "failed" });
    } else {
      results.push({ kind: c.kind, status: "sent" });
    }
  }
  return results;
}
