import { NextResponse } from "next/server";
import { verifyCallback, type CallbackTarget } from "@/lib/suno-callback";
import { getSunoResult } from "@/lib/suno-result";
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
    const intermediate = ["text", "first"].includes(body.data?.callbackType);
    if (intermediate && !target?.attempt) return NextResponse.json({ received: true });

    const db = getSupabaseAdmin();
    const kinds: CallbackTarget["kind"][] = target ? [target.kind] : ["song", "gift"];
    for (const kind of kinds) {
      const table = kind === "song" ? "generated_songs" : "gift_songs";
      const attemptColumn = kind === "song" ? "audio_reservation_id" : "start_attempt";
      let query = db.from(table).select("id, status, suno_task_id");
      if (target) query = query.eq("id", target.id);
      query = target?.attempt ? query.eq(attemptColumn, target.attempt) : query.eq("suno_task_id", taskId);
      const { data: job } = await query.maybeSingle().throwOnError();
      if (!job) continue;

      let result: Awaited<ReturnType<typeof getSunoResult>> | undefined;
      if (target?.attempt && !job.suno_task_id) {
        // The provider can acknowledge startup after the initiating request
        // lost its response. Only the signed, still-current reservation can bind it.
        if (job.status === "completed") return NextResponse.json({ received: true });
        result = await getSunoResult(taskId);
        const update = kind === "song"
          ? db.from(table).update({ suno_task_id: taskId, updated_at: new Date().toISOString() })
              .eq("status", "generating")
          : db.from(table).update({ suno_task_id: taskId, status: "generating", start_expires_at: null })
              .in("status", ["pending", "failed", "generating"]).not("start_expires_at", "is", null);
        const { data: bound } = await update.eq("id", job.id).eq(attemptColumn, target.attempt)
          .is("suno_task_id", null).select("id").maybeSingle().throwOnError();
        if (!bound) {
          // A parallel callback or the initiating request may have just bound
          // this same task. Let a terminal notification still complete it.
          const { data: current } = await db.from(table).select("status")
            .eq("id", job.id).eq(attemptColumn, target.attempt).eq("suno_task_id", taskId).maybeSingle().throwOnError();
          if (current?.status !== "generating") return NextResponse.json({ received: true });
        }
        job.status = "generating";
      } else if (job.suno_task_id !== taskId) {
        return NextResponse.json({ received: true });
      }

      if (intermediate) return NextResponse.json({ received: true });
      if (job.status === "generating") {
        // Import only the media returned by the account's authenticated lookup.
        const stage = await settleSong({ kind, id: job.id }, taskId, result);
        if (stage) return NextResponse.json({ error: "Result pending" }, { status: 503 });
      } else if (kind === "gift" && job.status === "completed") {
        const { data } = await db.from("gift_songs").select("gift_id").eq("id", job.id).single().throwOnError();
        await refreshGiftStatus(data.gift_id);
      }
      return NextResponse.json({ received: true });
    }
    // Signed but stale reservation. Retrying this callback cannot revive it.
    if (target?.attempt) return NextResponse.json({ received: true });
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  } catch (error) {
    console.error("[Suno Webhook] Failed to reconcile task", error);
    return NextResponse.json({ error: "Could not reconcile task" }, { status: 503 });
  }
}
