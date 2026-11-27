import { expect, test } from "@playwright/test";
import { mock } from "node:test";
import { createClient } from "@supabase/supabase-js";
import * as admin from "../src/lib/supabase/admin";
import { POST } from "../src/app/api/generate/audio/route";
import * as session from "../src/lib/supabase/server";
import { verifyCallback } from "../src/lib/suno-callback";

test("retries the task association without resubmitting audio or refunding an ambiguous request", async () => {
  const songId = "00000000-0000-4000-8000-000000000010";
  const owner = "00000000-0000-4000-8000-000000000011";
  const attempt = "00000000-0000-4000-8000-000000000012";
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: "https://database.example.test", SUPABASE_SERVICE_ROLE_KEY: "fixture",
    NEXT_PUBLIC_APP_URL: "https://babybeats.example.test", SUNO_API_KEY: "fixture",
    SUNO_WEBHOOK_SECRET: "test-secret",
  };
  const original = { ...process.env };
  Object.assign(process.env, env);

  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = mock.method(admin, "getSupabaseAdmin", () => db);
  const auth = mock.method(session, "createClient", async () => ({
    auth: { getUser: async () => ({ data: { user: { id: owner } } }) },
  }));
  let sent = 0;
  let writes = 0;
  let persistUnavailable = false;
  let providerReply: "accepted" | "unknown" | "rejected" = "accepted";
  let refunds = 0;
  const network = mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/rest/v1/rpc/reserve_song_audio") {
      return Response.json({ outcome: "reserved", attempt, id: songId, lyrics: "La la", theme: "fun",
        language: "es", child_name: "Alex", music_style: "pop" });
    }
    if (url.pathname === "/rest/v1/generated_songs") {
      if (url.searchParams.has("id")) {
        expect(url.searchParams.get("audio_reservation_id")).toBe("eq." + attempt);
        expect(url.searchParams.get("suno_task_id")).toBe("is.null");
        refunds++;
      }
      return Response.json([]);
    }
    if (url.pathname === "/api/v1/generate") {
      sent++;
      const callback = new URL(JSON.parse(String(init.body)).callBackUrl);
      expect(verifyCallback(callback)).toEqual({ kind: "song", id: songId, attempt });
      if (providerReply === "unknown") throw new TypeError("Connection lost");
      if (providerReply === "rejected") return Response.json({ code: 422 });
      return Response.json({ code: 200, data: { taskId: "provider-task" } });
    }
    if (url.pathname === "/rest/v1/rpc/attach_song_audio_task") {
      writes++;
      expect(JSON.parse(String(init.body))).toEqual({ p_song_id: songId, p_attempt: attempt, p_task_id: "provider-task" });
      return writes === 1 || persistUnavailable
        ? Response.json({ code: "fixture", message: "Write temporarily unavailable" }, { status: 503 })
        : Response.json("completed"); // Callback beat the writer.
    }
    throw new Error("Unexpected request in fixture: " + url.pathname);
  });

  function submit() {
    return POST(new Request("http://fixture/api/generate/audio", {
      method: "POST", body: JSON.stringify({ songId }),
    }));
  }

  try {
    const accepted = await submit();
    expect(accepted.status).toBe(200);
    expect((await accepted.json()).status).toBe("completed");
    expect(writes).toBe(2);
    expect(sent).toBe(1);

    persistUnavailable = true;
    const delayed = await submit();
    expect(delayed.status).toBe(202);
    expect((await delayed.json()).taskId).toBe("provider-task");
    expect(writes).toBe(4);
    expect(sent).toBe(2);
    expect(refunds).toBe(0);

    providerReply = "unknown";
    expect((await submit()).status).toBe(202);
    expect(refunds).toBe(0);
    expect(writes).toBe(4);

    providerReply = "rejected";
    expect((await submit()).status).toBe(502);
    expect(refunds).toBe(1);
    expect(sent).toBe(4);
  } finally {
    auth.mock.restore();
    adminClient.mock.restore();
    network.mock.restore();
    for (const key of Object.keys(env)) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
