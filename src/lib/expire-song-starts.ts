import { getSupabaseAdmin } from "@/lib/supabase/admin";

// A worker can stop after reserving a credit but before saving the provider's
// task ID. Jobs with a known task ID can still finish and must keep their hold.
export async function expireInterruptedSongStarts(userId: string) {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("generated_songs")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "generating")
    .not("audio_reservation_id", "is", null)
    .is("suno_task_id", null)
    .lt("updated_at", cutoff)
    .select("id");

  if (error) throw error;
  return data;
}
