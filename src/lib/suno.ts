import { getAppUrl } from "@/lib/utils";
import {
  SUNO_MODEL,
  SUNO_PARAMS,
  buildNegativeTags,
  buildSunoStyle,
  type Theme,
} from "@/lib/song-prompts";

const SUNO_API_BASE = "https://api.sunoapi.org/api/v1";

const TITLE_PREFIX: Record<string, string> = {
  es: "Canción para",
  en: "A song for",
  pt: "Canção para",
  fr: "Chanson pour",
  de: "Ein Lied für",
  it: "Canzone per",
};

/** Starts a Suno generation; the result arrives at /api/webhooks/suno. Returns the taskId. */
export async function startSunoGeneration(opts: {
  lyrics: string;
  musicStyle: string;
  theme: string;
  language: string;
  childName: string;
}): Promise<string> {
  const theme = (["lullaby", "educational", "fun"].includes(opts.theme) ? opts.theme : "lullaby") as Theme;

  const res = await fetch(`${SUNO_API_BASE}/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUNO_API_KEY?.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lyrics: opts.lyrics,
      customMode: true,
      instrumental: false,
      style: buildSunoStyle(opts.musicStyle, theme, opts.language),
      negativeTags: buildNegativeTags(opts.musicStyle),
      title: `${TITLE_PREFIX[opts.language] ?? TITLE_PREFIX.es} ${opts.childName}`.slice(0, 80),
      model: SUNO_MODEL,
      ...SUNO_PARAMS,
      callBackUrl: `${getAppUrl()}/api/webhooks/suno`,
    }),
  });

  const result = await res.json();
  if (result.code !== 200 || !result.data?.taskId) {
    throw new Error(result.msg || "Failed to start Suno generation");
  }
  return result.data.taskId as string;
}
