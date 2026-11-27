import { expect, test } from "@playwright/test";

const path = "/en/create/generating/00000000-0000-4000-8000-000000000001";

test("resumes after a temporary outage and lets the parent listen to either track", async ({ page }) => {
  let polls = 0;
  await page.clock.install();
  await page.route("**/api/generate/status?*", (route) => {
    polls++;
    if (polls === 1) return route.fulfill({ status: 503, json: {} });
    if (polls === 2) return route.fulfill({ json: { status: "generating", sunoStatus: "FIRST_SUCCESS" } });
    return route.fulfill({ json: {
      status: "completed", childName: "Olivia", shareToken: "example",
      audioUrlA: "/new-web/demos/cuna-emma.mp3", audioUrlB: "/new-web/demos/cuna-sofia.mp3",
    } });
  });
  await page.goto(path);
  await expect(page.getByRole("status", { name: "" }).filter({ hasText: "Reconnecting" })).toBeVisible();
  await page.clock.fastForward(16000);
  await expect(page.getByText("The first version is ready.", { exact: false })).toBeVisible();
  await page.clock.fastForward(16000);
  await expect(page.getByRole("heading", { name: "Olivia's song is ready!" })).toBeVisible();
  await page.getByRole("button", { name: "Version B" }).click();
  await expect(page.locator("main audio")).toHaveAttribute("src", "/new-web/demos/cuna-sofia.mp3");
  await page.clock.fastForward(30000);
  expect(polls).toBe(3);
});

test("shows a local sign-in link when the session expires", async ({ page }) => {
  await page.route("**/api/generate/status?*", (route) => route.fulfill({ status: 401, json: {} }));
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "Sign in to check your song" })).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "Sign in" })).toHaveAttribute("href", `/en/auth/login?next=${encodeURIComponent(path.slice(3))}`);
});

test("a deleted song has a route back to the library", async ({ page }) => {
  await page.route("**/api/generate/status?*", (route) => route.fulfill({ status: 404, json: {} }));
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "There is no audio generation to show for this song." })).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "My Songs" })).toHaveAttribute("href", "/en/my-songs");
});
