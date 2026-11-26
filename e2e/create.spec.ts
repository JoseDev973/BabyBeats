import { test, expect } from "@playwright/test";

test("a visitor starting a song can sign in and return to the composer", async ({ page }) => {
  await page.goto("/es/create");
  await expect(page).toHaveURL(/\/es\/auth\/login\?/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/create");
  await expect(page.locator('input[type="email"]')).toBeVisible();
});
