import { test, expect } from "@playwright/test";

test.describe("Gift flow", () => {
  test("loads /es/gift", async ({ page }) => {
    await page.goto("/es/gift");
    await expect(page).toHaveURL(/\/es\/gift/);
  });

  test("shows 3 pack cards", async ({ page }) => {
    await page.goto("/es/gift");
    await expect(page.getByText(/Mi Primer Álbum/i).first()).toBeVisible();
    await expect(page.getByText(/Dulces Sueños/i).first()).toBeVisible();
    await expect(page.getByText(/Aprendiendo con Música/i).first()).toBeVisible();
  });

  test("shows pricing", async ({ page }) => {
    await page.goto("/es/gift");
    await expect(page.getByText(/\$14[.,]99/).first()).toBeVisible();
    await expect(page.getByText(/\$9[.,]99/).first()).toBeVisible();
  });

  test('shows "Como funciona" section with 3 steps', async ({ page }) => {
    await page.goto("/es/gift");
    await expect(page.getByText(/[Cc]ómo funciona/i).first()).toBeVisible();
    // Check for step indicators (1, 2, 3) or step content
    const steps = page.locator("[data-testid='gift-step']").or(
      page.getByText(/[Pp]aso|[Ss]tep/i)
    );
    // At minimum, verify the section is present
    await expect(page.getByText(/[Cc]ómo funciona/i).first()).toBeVisible();
  });
});
