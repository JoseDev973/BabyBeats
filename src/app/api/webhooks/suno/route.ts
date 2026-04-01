import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getResend, FROM_ADDRESS } from "@/lib/resend";
import {
  giftReadyEmail,
  getGiftReadySubject,
} from "@/lib/emails/gift-ready";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  try {
    // Verify webhook secret
    const webhookSecret = process.env.SUNO_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${webhookSecret}`) {
        console.error("[Suno Webhook] Unauthorized request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const taskId = body.data?.taskId || body.taskId;
    const status = body.data?.status || body.status;

    if (!taskId) {
      console.error("[Suno Webhook] No taskId in payload:", JSON.stringify(body).slice(0, 200));
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Find the song by suno_task_id
    const { data: song } = await supabase
      .from("generated_songs")
      .select("id, child_name, share_token")
      .eq("suno_task_id", taskId)
      .single();

    // Also check gift_songs
    const { data: giftSong } = await supabase
      .from("gift_songs")
      .select("id, gift_id")
      .eq("suno_task_id", taskId)
      .single();

    if (!song && !giftSong) {
      console.error("[Suno Webhook] No song found for taskId:", taskId);
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    if (status === "SUCCESS") {
      const tracks = body.data?.response?.sunoData || body.data?.response?.data || body.output || [];
      const trackA = tracks?.[0];
      const trackB = tracks?.[1];

      if (!trackA) {
        console.error("[Suno Webhook] SUCCESS but no tracks:", JSON.stringify(body).slice(0, 300));
        return NextResponse.json({ error: "No tracks in response" }, { status: 400 });
      }

      const audioA = trackA.audioUrl || trackA.audio_url;
      const audioB = trackB?.audioUrl || trackB?.audio_url || null;
      const imageA = trackA.imageUrl || trackA.image_url || null;
      const imageB = trackB?.imageUrl || trackB?.image_url || null;
      const durationA = Math.round(trackA.duration || 0);
      const durationB = trackB ? Math.round(trackB.duration || 0) : null;

      // Update generated_songs
      if (song) {
        await supabase
          .from("generated_songs")
          .update({
            status: "completed",
            audio_url: audioA,
            duration_seconds: durationA,
            audio_url_b: audioB,
            duration_seconds_b: durationB,
            cover_image_url: imageA || imageB,
            is_public: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", song.id);

        console.log(`[Suno Webhook] Song ${song.id} completed (${song.child_name})`);
      }

      // Update gift_songs
      if (giftSong) {
        await supabase
          .from("gift_songs")
          .update({
            status: "completed",
            audio_url: audioA,
            cover_image_url: imageA || imageB,
            duration_seconds: durationA,
          })
          .eq("id", giftSong.id);

        // Check if all songs in this gift are completed
        const { data: pendingSongs } = await supabase
          .from("gift_songs")
          .select("id")
          .eq("gift_id", giftSong.gift_id)
          .neq("status", "completed");

        if (!pendingSongs || pendingSongs.length === 0) {
          await supabase
            .from("gifts")
            .update({ status: "ready", updated_at: new Date().toISOString() })
            .eq("id", giftSong.gift_id);

          // Send gift-ready email to the buyer
          try {
            const { data: gift } = await supabase
              .from("gifts")
              .select("buyer_id, child_name, total_songs, delivery_token, language")
              .eq("id", giftSong.gift_id)
              .single();

            if (gift?.buyer_id) {
              // Get buyer email from auth.users via service role
              const { data: authUser } = await supabase.auth.admin.getUserById(
                gift.buyer_id,
              );

              const buyerEmail = authUser?.user?.email;

              if (buyerEmail) {
                const lang = (gift.language === "en" ? "en" : "es") as "es" | "en";
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://babybeats.art";
                const deliveryUrl = `${appUrl}/gift/deliver/${gift.delivery_token}`;

                await getResend().emails.send({
                  from: FROM_ADDRESS,
                  to: buyerEmail,
                  subject: getGiftReadySubject(gift.child_name, lang),
                  html: giftReadyEmail({
                    childName: gift.child_name,
                    totalSongs: gift.total_songs,
                    deliveryUrl,
                    lang,
                  }),
                });

                console.log(
                  `[Suno Webhook] Gift-ready email sent to ${buyerEmail} for gift ${giftSong.gift_id}`,
                );
              }
            }
          } catch (emailErr) {
            // Don't fail the webhook if email sending fails
            console.error("[Suno Webhook] Failed to send gift-ready email:", emailErr);
          }

          console.log(`[Suno Webhook] Gift ${giftSong.gift_id} fully completed`);
        }

        console.log(`[Suno Webhook] Gift song ${giftSong.id} completed`);
      }
    }

    if (status === "FAILED") {
      if (song) {
        await supabase
          .from("generated_songs")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", song.id);
        console.log(`[Suno Webhook] Song ${song.id} FAILED`);
      }

      if (giftSong) {
        await supabase
          .from("gift_songs")
          .update({ status: "failed" })
          .eq("id", giftSong.id);
        console.log(`[Suno Webhook] Gift song ${giftSong.id} FAILED`);
      }
    }

    return NextResponse.json({ received: true, taskId, status });
  } catch (err) {
    console.error("[Suno Webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
