type Track = { audioUrl: string; imageUrl: string | null; duration: number | null };
type ProviderResult =
  | { status: "generating"; stage: string }
  | { status: "failed" }
  | { status: "completed"; tracks: Track[] };

const failedStatuses = new Set([
  "CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED", "SENSITIVE_WORD_ERROR", "FAILED",
]);

interface RawTrack {
  audioUrl?: string;
  audio_url?: string;
  imageUrl?: string;
  image_url?: string;
  duration?: number;
}

export async function getSunoResult(taskId: string): Promise<ProviderResult> {
  const url = new URL("https://api.sunoapi.org/api/v1/generate/record-info");
  url.searchParams.set("taskId", taskId);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.SUNO_API_KEY?.trim()}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Suno lookup returned ${response.status}`);

  const { code, data } = await response.json();
  if (code !== 200 || data?.taskId !== taskId || !data.status) {
    throw new Error("Suno lookup did not return the requested task");
  }
  if (failedStatuses.has(data.status)) return { status: "failed" };

  // A failed callback delivery can still have playable tracks in record-info.
  if (data.status === "SUCCESS" || data.status === "CALLBACK_EXCEPTION") {
    const raw: RawTrack[] = data.response?.sunoData ?? data.response?.data ?? [];
    const tracks = raw.flatMap((track) => {
      const audioUrl = track.audioUrl || track.audio_url;
      return audioUrl ? [{
        audioUrl,
        imageUrl: track.imageUrl || track.image_url || null,
        duration: typeof track.duration === "number" ? Math.round(track.duration) : null,
      }] : [];
    });
    if (tracks.length) return { status: "completed", tracks };
    if (data.status === "CALLBACK_EXCEPTION") return { status: "failed" };
    throw new Error("Completed Suno task has no playable tracks");
  }

  return { status: "generating", stage: data.status };
}
