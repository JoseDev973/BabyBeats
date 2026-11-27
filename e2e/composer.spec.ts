import { expect, test, type Route } from "@playwright/test";

const storageState = process.env.PLAYWRIGHT_AUTH_STATE;
test.use({ storageState });
test.skip(!storageState, "Provide a signed-in test session via PLAYWRIGHT_AUTH_STATE.");

test("preserves edited lyrics and the selected style and language", async ({ page }) => {
  // Hold each provider response until the in-flight controls have been checked.
  let releaseLyrics!: (route: Route) => void;
  const lyricsRequest = new Promise<Route>((resolve) => { releaseLyrics = resolve; });
  let releaseAudio!: (route: Route) => void;
  const audioRequest = new Promise<Route>((resolve) => { releaseAudio = resolve; });
  await page.route("**/api/generate/lyrics", releaseLyrics);
  await page.route("**/api/generate/audio", releaseAudio);
  await page.route("**/api/generate/status?*", (route) => route.fulfill({ json: { status: "generating" } }));

  await page.goto("/en/create");
  await page.getByRole("button", { name: /One song/ }).click();
  await page.getByRole("textbox").fill("桜");
  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.click();
  await next.click();
  const style = page.getByRole("group", { name: "Music Style", exact: true });
  const language = page.getByRole("main").getByRole("group", { name: "Language", exact: true });
  const audition = process.env.NEXT_PUBLIC_PREVIEW_MUSIC_STYLES === "true";
  await expect(style.getByRole("radio")).toHaveCount(6);
  if (audition) {
    await style.getByRole("button", { name: "Show more" }).click();
    await expect(style.getByRole("radio")).toHaveCount(12);
    await style.getByText("Cumbia", { exact: true }).click();
  } else {
    await expect(style.getByRole("button", { name: "Show more" })).toHaveCount(0);
    await style.getByText("Acoustic", { exact: true }).click();
  }
  await expect(language.getByRole("radio")).toHaveCount(6);
  await language.getByRole("button", { name: "Show more" }).click();
  await expect(language.getByRole("radio")).toHaveCount(12);
  await language.getByText("日本語").click();
  await language.getByRole("button", { name: "Show less" }).click();
  await expect(language.getByRole("radio", { name: "日本語" })).toBeChecked();

  await page.getByRole("button", { name: "Generate Lyrics" }).click();
  const lyrics = await lyricsRequest;
  await expect(page.getByRole("status").filter({ hasText: "Writing the lyrics" })).toBeVisible();
  const back = page.getByRole("button", { name: "Back", exact: true });
  await expect(back).toBeDisabled();
  expect(lyrics.request().postDataJSON()).toMatchObject({ childName: "桜", musicStyle: audition ? "cumbia" : "acoustic", language: "ja" });
  await lyrics.fulfill({ json: { songId: "test-song", lyrics: "Original lyrics" } });

  const editor = page.getByRole("textbox", { name: "Lyrics" });
  await expect(editor).toHaveValue("Original lyrics");
  await editor.fill(" ");
  const submit = page.getByRole("button", { name: "Generate Audio" });
  await expect(submit).toBeDisabled();
  const edited = "[Verse]\nOlivia baila al sol\n\n[Chorus]\nGira gira";
  await editor.fill(edited);
  await back.click();
  await next.click();
  await expect(editor).toHaveValue(edited);
  await submit.click();
  const audio = await audioRequest;
  expect(audio.request().postDataJSON()).toEqual({ songId: "test-song", lyrics: edited });
  await expect(editor).toBeDisabled();
  await expect(page.getByRole("status").filter({ hasText: "Sending your lyrics" })).toBeVisible();
  await audio.fulfill({ json: { status: "generating" } });
  await expect(page).toHaveURL(/\/en\/create\/generating\/test-song$/);
});

test("album retry resumes at the unfinished song", async ({ page }) => {
  let drafts = 0;
  const audioIds: string[] = [];
  await page.route("**/api/generate/lyrics", (route) =>
    route.fulfill({ json: { songId: `song-${++drafts}`, lyrics: "Lyrics" } }));
  await page.route("**/api/generate/audio", (route) => {
    audioIds.push(route.request().postDataJSON().songId);
    if (audioIds.length === 2) return route.fulfill({ status: 503, json: { error: "Try again" } });
    if (audioIds.length === 3) {
      return route.fulfill({ status: 400, json: { code: "invalid_lyrics", error: "New draft required" } });
    }
    return route.fulfill({ json: { status: "generating" } });
  });
  await page.goto("/en/create");
  await page.getByRole("button", { name: /An album/ }).click();
  await page.getByRole("textbox").fill("Olivia");
  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.click();
  await page.getByRole("button", { name: "3 songs" }).click();
  await next.click();
  await next.click();
  await page.getByRole("button", { name: "Generate Audio" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Try again" })).toBeVisible();
  await page.getByRole("button", { name: "Continue album" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "New draft required" })).toBeVisible();
  await page.getByRole("button", { name: "Continue album" }).click();
  await expect(page).toHaveURL(/\/en\/my-songs$/);
  expect(drafts).toBe(4);
  expect(audioIds).toEqual(["song-1", "song-2", "song-2", "song-3", "song-4"]);
});

test("a changed retry opens the existing song only after the parent chooses it", async ({ page }) => {
  await page.route("**/api/generate/lyrics", (route) =>
    route.fulfill({ json: { songId: "existing-song", lyrics: "First version" } }));
  await page.route("**/api/generate/audio", (route) =>
    route.fulfill({ status: 409, json: { code: "lyrics_already_submitted" } }));
  await page.route("**/api/generate/status?*", (route) => route.fulfill({ json: { status: "generating" } }));

  await page.goto("/en/create");
  await page.getByRole("button", { name: /One song/ }).click();
  await page.getByRole("textbox").fill("이안");
  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.click();
  await next.click();
  await page.getByRole("button", { name: "Generate Lyrics" }).click();
  const editor = page.getByRole("textbox", { name: "Lyrics" });
  await editor.fill("Second version");
  await page.getByRole("button", { name: "Generate Audio" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "earlier lyrics" })).toBeVisible();
  await expect(editor).toHaveValue("Second version");
  await page.getByRole("link", { name: "Open that song" }).click();
  await expect(page).toHaveURL(/\/en\/create\/generating\/existing-song$/);
});
