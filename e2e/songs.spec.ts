import { test, expect } from "@playwright/test";

test.describe("Song catalog", () => {
  test("loads /es/songs", async ({ page }) => {
    await page.goto("/es/songs");
    await expect(page).toHaveURL(/\/es\/songs/);
  });

  test("shows 10 song cards", async ({ page }) => {
    await page.goto("/es/songs");
    // Wait for song cards to render
    const cards = page.locator("[data-testid='song-card']").or(
      page.locator("article").or(page.locator(".song-card"))
    );
    await expect(cards.first()).toBeVisible();
    // Verify we have at least some song cards (check for ~10)
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test("search filter works", async ({ page }) => {
    await page.goto("/es/songs");
    const searchInput = page.getByPlaceholder(/[Bb]uscar/).or(
      page.getByRole("searchbox")
    );
    await searchInput.first().fill("Valentina");
    // Wait for filter to apply
    await page.waitForTimeout(500);
    const cards = page.locator("[data-testid='song-card']").or(
      page.locator("article").or(page.locator(".song-card"))
    );
    const count = await cards.count();
    expect(count).toBe(1);
  });

  test("category filter works", async ({ page }) => {
    await page.goto("/es/songs");
    // Click a category filter button
    const categoryButton = page.getByRole("button", { name: /Cuna|Educativa|Diversión/i });
    await categoryButton.first().click();
    await page.waitForTimeout(500);
    const cards = page.locator("[data-testid='song-card']").or(
      page.locator("article").or(page.locator(".song-card"))
    );
    await expect(cards.first()).toBeVisible();
  });

  test("click a song card triggers audio player", async ({ page }) => {
    await page.goto("/es/songs");
    const cards = page.locator("[data-testid='song-card']").or(
      page.locator("article").or(page.locator(".song-card"))
    );
    await cards.first().click();
    // Look for an audio player element appearing
    const audioPlayer = page.locator("audio").or(
      page.locator("[data-testid='audio-player']").or(
        page.getByRole("button", { name: /[Pp]ause|[Pp]lay/ })
      )
    );
    await expect(audioPlayer.first()).toBeVisible({ timeout: 5000 });
  });
});
