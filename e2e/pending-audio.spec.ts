import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

for (const surface of ["catalog", "demo"] as const) {
  test(`${surface} can pause and resume while audio is buffering`, async ({ page }) => {
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/*", async (route) => {
      if (route.request().resourceType() !== "media") return route.continue();
      await waiting;
      await route.fulfill({
        path: resolve("public/new-web/demos/cuna-sofia.mp3"),
        contentType: "audio/mpeg",
      });
    });

    try {
      await page.goto(surface === "demo" ? "/es" : "/es/songs", { waitUntil: "domcontentloaded" });
      const start = surface === "demo"
        ? page.getByRole("button", { name: /^Reproducir:/ }).first()
        : page.locator(".grid button:enabled").first();
      await start.click();
      const player = surface === "demo"
        ? page.locator("audio[src$='cuna-sofia.mp3']").first().locator("..")
        : page.locator(".fixed.bottom-0");
      await expect(player.getByText(/cargando/i)).toBeVisible();
      await player.getByRole("button", { name: /^Pausar/ }).click();
      await expect(player.getByText(/cargando/i)).toHaveCount(0);
      await player.getByRole("button", { name: /^Reproducir/ }).click();
      await expect(player.getByText(/cargando/i)).toBeVisible();
      release();
      await expect(player.getByText(/cargando/i)).toHaveCount(0);
      await expect(player.getByRole("button", { name: /^Pausar/ })).toBeVisible();
    } finally {
      release();
    }
  });
}
