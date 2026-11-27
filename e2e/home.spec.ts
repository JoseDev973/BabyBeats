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

  test("shows hero with the main CTA", async ({ page }) => {
    await page.goto("/es");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/canción con su nombre/i);
    await expect(page.getByRole("link", { name: /Crea su primera canción gratis/i })).toBeVisible();
  });

  test('shows "Así de fácil" section', async ({ page }) => {
    await page.goto("/es");
    await expect(page.getByText(/Así de fácil/).first()).toBeVisible();
  });

  test("shows the three kinds of songs with demos", async ({ page }) => {
    await page.goto("/es");
    await expect(page.getByRole("heading", { name: /Para dormir/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Para aprender/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Para jugar/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Reproducir/i }).first()).toBeVisible();
  });

  test("playing the second lullaby demo pauses the hero even when both use the same MP3", async ({ page }) => {
    await page.goto("/es");
    const demos = page.locator("audio[src$='cuna-sofia.mp3']");
    await expect(demos).toHaveCount(2);
    for (const demo of await demos.all()) {
      await demo.locator("..").getByRole("button").click();
      await expect(demo).toHaveJSProperty("paused", false);
    }
    await expect(demos.first()).toHaveJSProperty("paused", true);
    await expect(demos.last().locator("..").getByRole("button")).toHaveAccessibleName(/pausar/i);
  });

  test("language toggle ES/EN works", async ({ page }) => {
    await page.goto("/es");
    await page.getByRole("link", { name: "EN", exact: true }).click();
    await expect(page).toHaveURL(/\/en/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/song with their name/i);
  });

  test("navigation links work", async ({ page }) => {
    await page.goto("/es");
    const header = page.getByRole("banner");
    for (const label of ["Crear", "Canciones", "Regalar", "Precios", "Iniciar sesión"]) {
      await expect(header.getByRole("link", { name: new RegExp(label, "i") }).first()).toBeVisible();
    }
  });

  test("/new redirects to the home page", async ({ page }) => {
    await page.goto("/es/new");
    await expect(page).toHaveURL(/\/es$/);
  });
});
