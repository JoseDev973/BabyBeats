import { getSunoResult } from "@/lib/suno-result";
import { persistFromUrl, extOf } from "@/lib/persist-audio";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/utils";
import { getResend, FROM_ADDRESS } from "@/lib/resend";
import { giftReadyEmail, getGiftReadySubject } from "@/lib/emails/gift-ready";
import { songReadyEmail, getSongReadySubject } from "@/lib/emails/song-ready";
import type { CallbackTarget } from "@/lib/suno-callback";

async function sendReadyEmail(userId: string | null, subject: string, html: string) {
  if (!userId) return;
  try {
    const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(userId);
    if (error) throw error;
    if (!data.user.email) return;
    const sent = await getResend().emails.send({ from: FROM_ADDRESS, to: data.user.email, subject, html });
    if (sent.error) throw sent.error;
  } catch (error) {
    console.error("[Suno] Could not send ready email", error);
  }
}

// Called after a gift track changes and by the buyer's status page. The latter
// also recovers an interruption between committing a track and updating its gift.
export async function refreshGiftStatus(giftId: string) {
  const db = getSupabaseAdmin();
  const { data: songs } = await db.from("gift_songs").select("status").eq("gift_id", giftId).throwOnError();
  if (!songs.length || !songs.every((song) => song.status === "completed")) return;

  const { data: gift } = await db.from("gifts")
    .update({ status: "ready", updated_at: new Date().toISOString() })
    .eq("id", giftId).eq("status", "generating").eq("total_songs", songs.length)
    .select("buyer_id, child_name, total_songs, delivery_token, language").maybeSingle().throwOnError();
  if (!gift) return;

  const lang = gift.language === "en" ? "en" : "es";
  await sendReadyEmail(gift.buyer_id, getGiftReadySubject(gift.child_name, lang), giftReadyEmail({
    childName: gift.child_name,
    totalSongs: gift.total_songs,
    deliveryUrl: `${getAppUrl()}/gift/deliver/${gift.delivery_token}`,
    lang,
  }));
}

export async function settleSong(
  target: CallbackTarget,
  taskId: string,
  verifiedResult?: Awaited<ReturnType<typeof getSunoResult>>,
) {
  const db = getSupabaseAdmin();
  const result = verifiedResult ?? await getSunoResult(taskId);
  if (result.status === "generating") return result.stage;

  if (target.kind === "gift" && result.status === "failed") {
    await db.rpc("fail_gift_song", { p_song_id: target.id, p_task_id: taskId }).throwOnError();
    return null;
  }

  const table = target.kind === "song" ? "generated_songs" : "gift_songs";
  const trackA = result.status === "completed" ? result.tracks[0] : null;
  const trackB = result.status === "completed" ? result.tracks[1] : null;
  const cover = trackA?.imageUrl || trackB?.imageUrl;
  const folder = `${target.kind === "song" ? "generated" : "gift"}/${target.id}`;
  const [audioA, audioB, image] = await Promise.all([
    persistFromUrl(trackA?.audioUrl, `${folder}/a.mp3`),
    persistFromUrl(target.kind === "song" ? trackB?.audioUrl : null, `${folder}/b.mp3`),
    persistFromUrl(cover, `${folder}/cover.${extOf(cover, "jpeg")}`),
  ]);

  const values = result.status === "failed"
    ? { status: "failed" }
    : {
      status: "completed",
      audio_url: audioA,
      duration_seconds: trackA?.duration,
      cover_image_url: image,
      ...(target.kind === "song" && {
        audio_url_b: audioB, duration_seconds_b: trackB?.duration ?? null, is_public: true,
      }),
    };

  // A callback and a status check may finish together. Only the first writer
  // wins the transition and sends a personal song notification.
  const update = db.from(table).update({
    ...values, ...(target.kind === "song" && { updated_at: new Date().toISOString() }),
  }).eq("id", target.id).eq("suno_task_id", taskId).eq("status", "generating");

  if (target.kind === "gift") {
    const { data } = await update.select("gift_id").maybeSingle().throwOnError();
    if (data) await refreshGiftStatus(data.gift_id);
  } else {
    const { data: song } = await update.select("child_name, user_id, language, share_token").maybeSingle().throwOnError();
    if (song && result.status === "completed") {
      const lang = song.language === "en" ? "en" : "es";
      const songUrl = song.share_token ? `${getAppUrl()}/share/${song.share_token}` : `${getAppUrl()}/${lang}/my-songs`;
      await sendReadyEmail(song.user_id, getSongReadySubject(song.child_name, lang),
        songReadyEmail({ childName: song.child_name, songUrl, lang, coverUrl: image }));
    }
  }
  return null;
}
