import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshGiftStatus, settleSong } from "@/lib/settle-song";

export async function GET(request: Request) {
  const giftId = new URL(request.url).searchParams.get("giftId");
  if (!giftId) return NextResponse.json({ error: "Missing giftId" }, { status: 400 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const readGift = () => db.from("gifts").select("status, delivery_token")
    .eq("id", giftId).eq("buyer_id", user.id).maybeSingle().throwOnError();

  try {
    let { data: gift } = await readGift();
    if (gift?.status === "generating") {
      const { data: jobs } = await db.from("gift_songs").select("id, suno_task_id")
        .eq("gift_id", giftId).eq("status", "generating").not("suno_task_id", "is", null).throwOnError();
      await Promise.all(jobs.map((job) => settleSong({ kind: "gift", id: job.id }, job.suno_task_id)));
      await refreshGiftStatus(giftId);
      ({ data: gift } = await readGift());
    }
    if (gift?.status === "generating") {
      const { data: unstarted } = await db.from("gift_songs").select("id")
        .eq("gift_id", giftId).is("suno_task_id", null).neq("status", "completed")
        .or(`start_expires_at.is.null,start_expires_at.lte.${new Date().toISOString()}`)
        .limit(1).throwOnError();
      return NextResponse.json({ ...gift, retryAvailable: unstarted.length > 0 });
    }
    if (!gift) return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    return NextResponse.json(gift);
  } catch (error) {
    console.error("[Gift status] Could not check gift", error);
    return NextResponse.json({ error: "Status temporarily unavailable" }, { status: 503 });
  }
}
