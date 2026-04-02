import { test, expect } from "@playwright/test";

test.describe("Legal pages", () => {
  test('/es/terms loads and contains "Terminos"', async ({ page }) => {
    await page.goto("/es/terms");
    await expect(page.getByText(/[Tt]érminos/i).first()).toBeVisible();
  });

  test('/es/privacy loads and contains "Privacidad"', async ({ page }) => {
    await page.goto("/es/privacy");
    await expect(page.getByText(/[Pp]rivacidad/i).first()).toBeVisible();
  });

  test("footer contains links to terms and privacy", async ({ page }) => {
    await page.goto("/es");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /[Tt]érminos/i }).first()
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /[Pp]rivacidad/i }).first()
    ).toBeVisible();
  });
});
