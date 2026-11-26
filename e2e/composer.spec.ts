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
  await page.getByRole("textbox").fill("Olivia");
  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.click();
  await next.click();
  const style = page.getByRole("group", { name: "Music Style", exact: true });
  const language = page.getByRole("main").getByRole("group", { name: "Language", exact: true });
  for (const group of [style, language]) {
    await expect(group.getByRole("radio")).toHaveCount(6);
    await group.getByRole("button", { name: "Show more" }).click();
    await expect(group.getByRole("radio")).toHaveCount(12);
  }
  await style.getByText("Cumbia", { exact: true }).click();
  await language.getByText("日本語").click();
  await language.getByRole("button", { name: "Show less" }).click();
  await expect(language.getByRole("radio", { name: "日本語" })).toBeChecked();

  await page.getByRole("button", { name: "Generate Lyrics" }).click();
  const lyrics = await lyricsRequest;
  await expect(page.getByRole("status").filter({ hasText: "Writing the lyrics" })).toBeVisible();
  const back = page.getByRole("button", { name: "Back", exact: true });
  await expect(back).toBeDisabled();
  expect(lyrics.request().postDataJSON()).toMatchObject({ musicStyle: "cumbia", language: "ja" });
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
    return audioIds.length === 2
      ? route.fulfill({ status: 503, json: { error: "Try again" } })
      : route.fulfill({ json: { status: "generating" } });
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
  await expect(page).toHaveURL(/\/en\/my-songs$/);
  expect(drafts).toBe(3);
  expect(audioIds).toEqual(["song-1", "song-2", "song-2", "song-3"]);
});
