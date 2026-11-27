import { test, expect } from "@playwright/test";
import { mock } from "node:test";
import { createClient } from "@supabase/supabase-js";
import * as adminModule from "../src/lib/supabase/admin";
import * as sessionModule from "../src/lib/supabase/server";
import * as suno from "../src/lib/suno";
import { POST } from "../src/app/api/gift/generate/route";

test("only a definite rejection releases the gift track's startup attempt", async () => {
  const attempt = "4dbb5f76-0ff4-49b2-81f3-a086fc57d771";
  const song = { id: "track", start_attempt: attempt, theme: "fun", music_style: "playful", language: "es", lyrics: "Olivia canta" };
  const writes: Record<string, unknown>[] = [];
  const db = createClient("https://gift.test", "fixture", {
    global: { fetch: async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      expect(url.hostname).toBe("gift.test");
      if (url.pathname.endsWith("/gifts")) {
        expect(init?.method ?? "GET").toBe("GET");
        return Response.json([{ paid_at: "2026-11-01", pack_type: "learning", gift_songs: [{ count: 5 }] }]);
      }
      if (url.pathname.endsWith("/rpc/prepare_paid_gift")) {
        return Response.json({ status: "started", delivery_mode: "link", child_name: "Olivia", language: "es", starts: [song] });
      }
      expect(url.pathname).toMatch(/\/gift_songs$/);
      expect(init?.method).toBe("PATCH");
      expect(url.searchParams.get("start_attempt")).toBe(`eq.${attempt}`);
      expect(url.searchParams.get("suno_task_id")).toBe("is.null");
      writes.push(JSON.parse(String(init?.body)));
      return Response.json([{ id: song.id }]);
    } },
  });
  let scenario: "accepted" | "unknown" | "rejected" = "accepted";
  const auth = mock.method(db.auth, "getUser", async () => ({ data: { user: { id: "buyer" } } }));
  const session = mock.method(sessionModule, "createClient", async () => db);
  const service = mock.method(adminModule, "getSupabaseAdmin", () => db);
  const submission = mock.method(suno, "startSunoGeneration", async (opts: Parameters<typeof suno.startSunoGeneration>[0]) => {
    expect(opts.callbackTarget).toEqual({ kind: "gift", id: song.id, attempt });
    if (scenario === "rejected") throw new suno.SunoSubmissionRejected("Declined in fixture");
    if (scenario === "unknown") throw new Error("Lost fixture response");
    return "accepted-task";
  });
  const request = () => new Request("http://app.test/api/gift/generate", {
    method: "POST", body: JSON.stringify({ giftId: "fixture-album" }),
  });
  try {
    expect((await POST(request())).status).toBe(200);
    expect(writes.at(-1)).toEqual({ status: "generating", suno_task_id: "accepted-task", start_expires_at: null });
    scenario = "unknown";
    writes.length = 0;
    expect((await POST(request())).status).toBe(502);
    expect(writes).toEqual([{ lyrics: song.lyrics }]);
    scenario = "rejected";
    expect((await POST(request())).status).toBe(502);
    expect(writes.at(-1)).toEqual({ status: "failed", start_attempt: null, start_expires_at: null });
  } finally {
    submission.mock.restore();
    service.mock.restore();
    session.mock.restore();
    auth.mock.restore();
  }
});
