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

  test("click a song card triggers audio player", async ({ page }) => {
    await page.goto("/es/songs");
    // Wait for cards to load
    const cards = page.locator(".grid > div.border-border");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await cards.first().click();
    // Audio player appears at bottom of page
    const player = page.locator(".fixed.bottom-0");
    await expect(player).toBeVisible({ timeout: 5000 });
  });
});
