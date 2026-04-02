import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("loads home page at /es", async ({ page }) => {
    await page.goto("/es");
    await expect(page).toHaveURL(/\/es/);
  });

  test("has correct title containing BabyBeats", async ({ page }) => {
    await page.goto("/es");
    await expect(page).toHaveTitle(/BabyBeats/);
  });

  test("shows hero section with CTA buttons", async ({ page }) => {
    await page.goto("/es");
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
    // Look for CTA buttons in the hero area
    const ctaButtons = page.getByRole("link").filter({ hasText: /Crear|Regalar|Empezar/i });
    await expect(ctaButtons.first()).toBeVisible();
  });

  test('shows "Como funciona" section', async ({ page }) => {
    await page.goto("/es");
    const section = page.getByText(/[Cc]ómo funciona/);
    await expect(section.first()).toBeVisible();
  });

  test("shows category cards", async ({ page }) => {
    await page.goto("/es");
    await expect(page.getByText(/Canciones de Cuna/i).first()).toBeVisible();
    await expect(page.getByText(/Educativas/i).first()).toBeVisible();
    await expect(page.getByText(/Diversión/i).first()).toBeVisible();
  });

  test("language toggle ES/EN works", async ({ page }) => {
    await page.goto("/es");
    const enToggle = page.getByRole("link", { name: /EN/i }).or(
      page.getByText(/EN/).first()
    );
    await enToggle.first().click();
    await expect(page).toHaveURL(/\/en/);
  });

  test("navigation links work", async ({ page }) => {
    await page.goto("/es");
    const nav = page.getByRole("navigation");

    for (const label of ["Crear", "Canciones", "Regalar", "Planes"]) {
      const link = nav.getByRole("link", { name: new RegExp(label, "i") });
      await expect(link.first()).toBeVisible();
    }
  });
});
