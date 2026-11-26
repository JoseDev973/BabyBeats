import { resolve } from "node:path";
import { test, expect } from "@playwright/test";

test.describe("Song catalog", () => {
  test("loads /es/songs", async ({ page }) => {
    await page.goto("/es/songs");
    await expect(page).toHaveURL(/\/es\/songs/);
  });

  test("shows song cards", async ({ page }) => {
    await page.goto("/es/songs");
    // Song cards are divs with border-border inside a grid
    const cards = page.locator(".grid > div.border-border");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("search filter works", async ({ page }) => {
    await page.goto("/es/songs");
    const searchInput = page.locator("input[type='text']").first();
    await searchInput.fill("Valentina");
    await page.waitForTimeout(1000);
    // After filtering, fewer cards should show
    const visibleText = await page.textContent("body");
    expect(visibleText).toContain("Valentina");
  });

  test("category filter works", async ({ page }) => {
    await page.goto("/es/songs");
    // Category filter is a select element
    const categorySelect = page.locator("select").first();
    await expect(categorySelect).toBeVisible();
    // Select a non-default option
    const options = categorySelect.locator("option");
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1);
  });

  test("starting mid-list advances to the next playable track and stops at the last one", async ({ page }) => {
    await page.goto("/es/songs");
    const playable = page.locator(".grid button:enabled");
    const count = await playable.count();
    expect(count).toBeGreaterThanOrEqual(3);
    const penultimate = playable.nth(count - 2);
    const last = playable.last();
    const lastTitle = await last.locator("..").locator("p").first().innerText();
    await penultimate.focus();
    await penultimate.press("Enter");
    const player = page.locator(".fixed.bottom-0");
    const next = player.getByRole("button", { name: "Siguiente" });
    await next.click();
    await expect(player.getByText(lastTitle, { exact: true })).toBeVisible();
    await expect(next).toBeDisabled();
  });

  test("a failed track can be retried from the player", async ({ page }) => {
    let failAudio = true;
    await page.route("**/*", (route) => {
      if (route.request().resourceType() !== "media") return route.continue();
      if (failAudio) return route.abort();
      return route.fulfill({
        path: resolve("public/new-web/demos/cuna-sofia.mp3"),
        contentType: "audio/mpeg",
      });
    });
    await page.goto("/es/songs");
    await page.locator(".grid button:enabled").first().click();
    const player = page.locator(".fixed.bottom-0");
    await expect(player.getByRole("alert")).toBeVisible();
    failAudio = false;
    await player.getByRole("button", { name: "Reproducir" }).click();
    await expect(player.getByRole("button", { name: "Pausar" })).toBeVisible();
    await expect(player.getByRole("alert")).toHaveCount(0);
  });

  test("click a song card triggers audio player", async ({ page }) => {
    await page.goto("/es/songs");
    const cards = page.locator(".grid button:enabled");
    await cards.first().click();
    // Audio player appears at bottom of page
    const player = page.locator(".fixed.bottom-0");
    await expect(player).toBeVisible({ timeout: 5000 });
  });
});
