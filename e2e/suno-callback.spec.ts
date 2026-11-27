import { test, expect } from "@playwright/test";
import { POST } from "../src/app/api/webhooks/suno/route";
import { callbackUrl, type CallbackTarget } from "../src/lib/suno-callback";
import { startSunoGeneration, SunoSubmissionRejected } from "../src/lib/suno";

const targetId = "00000000-0000-4000-8000-000000000001";
const reservation = "00000000-0000-4000-8000-000000000002";

test("a signed callback recovers the accepted task only for the current startup attempt", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env;
  process.env = {
    ...originalEnv, SUNO_WEBHOOK_SECRET: "test-secret", SUNO_API_KEY: "test-provider",
    NEXT_PUBLIC_SUPABASE_URL: "https://database.test", SUPABASE_SERVICE_ROLE_KEY: "test-admin",
  };
  const writes: { values: Record<string, unknown>; filters: URLSearchParams }[] = [];
  let task: string | null = null;
  let status = "pending";
  let lookups = 0;
  let providerStatus = "TEXT_SUCCESS";
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname === "api.sunoapi.org") {
      lookups++;
      return Response.json({ code: 200, data: { taskId: "provider-task", status: providerStatus } });
    }
    expect(url.hostname).toBe("database.test");
    if (init?.method === "PATCH") {
      const values = JSON.parse(String(init.body));
      writes.push({ values, filters: url.searchParams });
      if (values.suno_task_id) task = values.suno_task_id;
      if (values.status) status = values.status;
      return Response.json([{ id: targetId }]);
    }
    const attempt = url.searchParams.get("start_attempt") ?? url.searchParams.get("audio_reservation_id");
    return Response.json(attempt === `eq.${reservation}` ? [{ id: targetId, status, suno_task_id: task }] : []);
  };
  async function notify(target: CallbackTarget, stage: string) {
    const url = callbackUrl("https://app.test", target);
    return POST(new Request(url, {
      method: "POST", body: JSON.stringify({ data: { task_id: "provider-task", callbackType: stage } }),
    }));
  }

  try {
    const gift = { kind: "gift", id: targetId, attempt: reservation } as const;
    expect((await notify({ ...gift, attempt: targetId }, "first")).status).toBe(200);
    expect(lookups).toBe(0);
    expect(writes).toHaveLength(0);

    expect((await notify(gift, "text")).status).toBe(200);
    expect(lookups).toBe(1);
    expect(writes[0].values).toEqual({ suno_task_id: "provider-task", status: "generating", start_expires_at: null });
    expect(writes[0].filters.get("start_attempt")).toBe(`eq.${reservation}`);
    expect(writes[0].filters.get("suno_task_id")).toBe("is.null");
    expect(writes[0].filters.get("start_expires_at")).toBe("not.is.null");
    expect((await notify(gift, "first")).status).toBe(200);
    expect(writes).toHaveLength(1);

    task = null;
    status = "generating";
    providerStatus = "GENERATE_AUDIO_FAILED";
    expect((await notify({ ...gift, kind: "song" }, "error")).status).toBe(200);
    expect(lookups).toBe(2);
    expect(writes[1].filters.get("audio_reservation_id")).toBe(`eq.${reservation}`);
    expect(writes[1].filters.get("status")).toBe("eq.generating");
    expect(writes[1].filters.get("suno_task_id")).toBe("is.null");
    expect(writes[2].values.status).toBe("failed");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("startup distinguishes definite rejections from an unconfirmed task ID", async () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;
  process.env = { ...originalEnv, SUNO_API_KEY: "test-provider", SUNO_WEBHOOK_SECRET: "" };
  const start = () => startSunoGeneration({
    callbackTarget: { kind: "song", id: targetId }, lyrics: "Hola", musicStyle: "gentle",
    theme: "lullaby", language: "es", childName: "Ana",
  });
  try {
    globalThis.fetch = async () => { throw new Error("Unexpected request"); };
    await expect(start()).rejects.toBeInstanceOf(SunoSubmissionRejected);
    process.env.SUNO_WEBHOOK_SECRET = "test-secret";
    globalThis.fetch = async () => Response.json({ code: 429 });
    await expect(start()).rejects.toBeInstanceOf(SunoSubmissionRejected);
    globalThis.fetch = async () => new Response(null, { status: 503 });
    await expect(start()).rejects.not.toBeInstanceOf(SunoSubmissionRejected);
    globalThis.fetch = async () => Response.json({ code: 200, data: {} });
    await expect(start()).rejects.not.toBeInstanceOf(SunoSubmissionRejected);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});
