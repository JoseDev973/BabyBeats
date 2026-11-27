import assert from "node:assert/strict";
import { test } from "node:test";
import { getSunoResult } from "../src/lib/suno-result.ts";
import { callbackUrl, verifyCallback } from "../src/lib/suno-callback.ts";

test("the callback signature is specific to this song and gift type", () => {
  const previous = process.env.SUNO_WEBHOOK_SECRET;
  process.env.SUNO_WEBHOOK_SECRET = "local-test-secret";
  try {
    const target = { kind: "song", id: "123" };
    const url = new URL(callbackUrl("https://example.test", target));
    assert.deepEqual(verifyCallback(url), target);
    const attempt = "00000000-0000-4000-8000-000000000001";
    const signed = new URL(callbackUrl("https://example.test", { ...target, attempt }));
    assert.deepEqual(verifyCallback(signed), { ...target, attempt });
    signed.searchParams.delete("attempt");
    assert.equal(verifyCallback(signed), null);
    url.searchParams.set("attempt", attempt);
    assert.equal(verifyCallback(url), null);
    url.searchParams.delete("attempt");
    url.searchParams.set("kind", "gift");
    assert.equal(verifyCallback(url), null);
    url.searchParams.set("kind", "song");
    url.searchParams.set("id", "456");
    assert.equal(verifyCallback(url), null);
  } finally {
    if (previous === undefined) delete process.env.SUNO_WEBHOOK_SECRET;
    else process.env.SUNO_WEBHOOK_SECRET = previous;
  }
});

test("provider lookup keeps intermediate stages and recognizes each terminal failure", async (t) => {
  let status = "PENDING";
  t.mock.method(globalThis, "fetch", async () => Response.json({ code: 200, data: { taskId: "a", status } }));
  for (status of ["PENDING", "TEXT_SUCCESS", "FIRST_SUCCESS"]) {
    assert.deepEqual(await getSunoResult("a"), { status: "generating", stage: status });
  }
  for (status of ["CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED", "SENSITIVE_WORD_ERROR", "CALLBACK_EXCEPTION", "FAILED"]) {
    assert.deepEqual(await getSunoResult("a"), { status: "failed" });
  }
});

test("recovers both playable variations after a callback delivery exception", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ code: 200, data: {
    taskId: "a", status: "CALLBACK_EXCEPTION", response: { sunoData: [
      { audio_url: "https://example.test/a.mp3", duration: 65.8 },
      { audioUrl: "https://example.test/b.mp3", imageUrl: "https://example.test/cover.png" },
    ] },
  } }));
  assert.deepEqual(await getSunoResult("a"), { status: "completed", tracks: [
    { audioUrl: "https://example.test/a.mp3", imageUrl: null, duration: 66 },
    { audioUrl: "https://example.test/b.mp3", imageUrl: "https://example.test/cover.png", duration: null },
  ] });
});

test("lookup errors, missing media and mismatched task IDs can be retried", async (t) => {
  let response = { code: 200, data: { taskId: "wrong", status: "SUCCESS" } };
  t.mock.method(globalThis, "fetch", async () => Response.json(response));
  await assert.rejects(getSunoResult("a"));
  response = { code: 500, data: null };
  await assert.rejects(getSunoResult("a"));
  response = { code: 200, data: { taskId: "a", status: "SUCCESS", response: {} } };
  await assert.rejects(getSunoResult("a"));
});
