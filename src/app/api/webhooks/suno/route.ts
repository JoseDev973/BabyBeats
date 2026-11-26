import { NextResponse } from "next/server";
import { verifyCallback, type CallbackTarget } from "@/lib/suno-callback";
import { settleSong, refreshGiftStatus } from "@/lib/settle-song";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const secret = process.env.SUNO_WEBHOOK_SECRET?.trim();
    if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    const target = verifyCallback(new URL(request.url));
    const legacy = request.headers.get("authorization") === `Bearer ${secret}`;
    if (!target && !legacy) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const taskId = body?.data?.task_id ?? body?.data?.taskId ?? body?.taskId;
    if (typeof taskId !== "string" || !taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }
    if (["text", "first"].includes(body.data?.callbackType)) {
      return NextResponse.json({ received: true });
    }

    // Never import media URLs from the incoming request. Read the matching
    // task from the account's authenticated Suno API instead.
    const db = getSupabaseAdmin();
    const kinds: CallbackTarget["kind"][] = target ? [target.kind] : ["song", "gift"];
    for (const kind of kinds) {
      const table = kind === "song" ? "generated_songs" : "gift_songs";
      let query = db.from(table).select("id, status").eq("suno_task_id", taskId);
      if (target) query = query.eq("id", target.id);
      const { data: job } = await query.maybeSingle().throwOnError();
      if (!job) continue;
      if (job.status === "generating") {
        const stage = await settleSong({ kind, id: job.id }, taskId);
        // The terminal callback may arrive before record-info catches up.
        if (stage) return NextResponse.json({ error: "Result pending" }, { status: 503 });
      } else if (kind === "gift" && job.status === "completed") {
        const { data } = await db.from("gift_songs").select("gift_id").eq("id", job.id).single().throwOnError();
        await refreshGiftStatus(data.gift_id);
      }
      return NextResponse.json({ received: true });
    }
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  } catch (error) {
    console.error("[Suno Webhook] Failed to reconcile task", error);
    return NextResponse.json({ error: "Could not reconcile task" }, { status: 503 });
  }
}
