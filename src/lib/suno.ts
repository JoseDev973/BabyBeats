import { getAppUrl } from "@/lib/utils";
import {
  SUNO_MODEL,
  SUNO_PARAMS,
  buildNegativeTags,
  buildSunoStyle,
  type Theme,
} from "@/lib/song-prompts";

import { callbackUrl, type CallbackTarget } from "@/lib/suno-callback";

const SUNO_API_BASE = "https://api.sunoapi.org/api/v1";

/** Suno declined the request or a local preflight failed before sending it. */
export class SunoSubmissionRejected extends Error {}

// Timeout and conflict responses can represent a task that was already accepted.
const rejectionCodes = new Set([400, 401, 402, 403, 404, 405, 413, 422, 429, 430, 451, 455]);

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
  callbackTarget: CallbackTarget;
  lyrics: string;
  musicStyle: string;
  theme: string;
  language: string;
  childName: string;
}): Promise<string> {
  const theme = (["lullaby", "educational", "fun"].includes(opts.theme) ? opts.theme : "lullaby") as Theme;

  const apiKey = process.env.SUNO_API_KEY?.trim();
  if (!apiKey) throw new SunoSubmissionRejected("SUNO_API_KEY is not configured");
  let signedCallback: string;
  try {
    signedCallback = callbackUrl(getAppUrl(), opts.callbackTarget);
  } catch {
    throw new SunoSubmissionRejected("Invalid Suno callback configuration");
  }

  const res = await fetch(`${SUNO_API_BASE}/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: opts.lyrics,
      customMode: true,
      instrumental: false,
      style: buildSunoStyle(opts.musicStyle, theme, opts.language),
      negativeTags: buildNegativeTags(opts.musicStyle),
      title: `${TITLE_PREFIX[opts.language] ?? TITLE_PREFIX.es} ${opts.childName}`.slice(0, 80),
      model: SUNO_MODEL,
      ...SUNO_PARAMS,
      callBackUrl: signedCallback,
    }),
  });

  if (!res.ok) {
    if (rejectionCodes.has(res.status)) throw new SunoSubmissionRejected(`Suno rejected generation (${res.status})`);
    throw new Error(`Suno submission returned ${res.status}`);
  }
  const result = await res.json();
  if (rejectionCodes.has(result.code)) throw new SunoSubmissionRejected(`Suno rejected generation (${result.code})`);
  if (result.code !== 200 || typeof result.data?.taskId !== "string" || !result.data.taskId) {
    throw new Error("Suno did not confirm the task ID");
  }
  return result.data.taskId;
}
