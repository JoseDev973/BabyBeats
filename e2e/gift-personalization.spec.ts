import { expect, test } from "@playwright/test";

const giftId = "00000000-0000-4000-8000-000000000005";
const giftPath = `/es/gift/create/${giftId}`;

test.beforeEach(async ({ page }) => {
  await page.route("**/rest/v1/gifts?*", route => route.fulfill({
    json: {
      id: giftId, pack_type: "sweet_dreams", total_songs: 5, child_name: "—",
      language: "es", status: "draft", delivery_mode: "link",
      paid_at: "2026-01-01T00:00:00Z", delivery_token: "example-token",
    },
  }));
});

test("a redeemable gift skips song configuration and shows a redemption link", async ({ page }) => {
  let submission;
  await page.route("**/api/gift/generate", async route => {
    submission = route.request().postDataJSON();
    await route.fulfill({ json: { status: "ready", deliveryMode: "redeem", deliveryToken: "example-token" } });
  });
  await page.goto(giftPath);
  await page.getByPlaceholder(/Sofía/).fill("Olivia");
  await page.getByRole("button", { name: /Que ellos creen/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("textbox", { name: "Copiar link de regalo" })).toHaveValue(/\/es\/gift\/redeem\/example-token$/);
  expect(submission).toEqual({ giftId, locale: "es", settings: { childName: "Olivia", language: "es", deliveryMode: "redeem" } });
});

test("retrying the same paid album keeps its complete song configuration", async ({ page }) => {
  const submissions: { settings: { songs: unknown[] } }[] = [];
  await page.route("**/api/gift/generate", async route => {
    submissions.push(route.request().postDataJSON());
    if (submissions.length === 1) {
      await route.fulfill({ status: 502, json: { error: "GENERATION_FAILED" } });
    } else {
      await route.fulfill({ json: { status: "ready", deliveryMode: "link", deliveryToken: "example-token" } });
    }
  });
  await page.goto(giftPath);
  await page.getByPlaceholder(/Sofía/).fill("Olivia");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar con este regalo" }).click();
  await expect(page.getByRole("textbox", { name: "Copiar link de regalo" })).toHaveValue(/\/gift\/deliver\/example-token$/);
  expect(submissions[0].settings.songs).toHaveLength(5);
  expect(submissions[1]).toEqual(submissions[0]);
  await expect(page).toHaveURL(new RegExp(giftPath + "$"));
});

test("a buyer reopening a redeemed gift sees its status", async ({ page }) => {
  await page.route("**/rest/v1/gifts?*", route => route.fulfill({
    json: {
      pack_type: "learning", total_songs: 5, child_name: "Olivia", language: "es",
      status: "redeemed", delivery_mode: "redeem", delivery_token: "used-token", paid_at: "2026-01-01",
    },
  }));
  await page.goto(giftPath);
  await expect(page.getByRole("heading", { name: "Este regalo ya fue canjeado" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Copiar link de regalo" })).toHaveCount(0);
});

test("a provider failure after reload can resume using the saved settings", async ({ page }) => {
  await page.clock.install();
  await page.route("**/rest/v1/gifts?*", route => route.fulfill({
    json: {
      pack_type: "learning", total_songs: 5, child_name: "Olivia", language: "es",
      status: "generating", delivery_mode: "link", delivery_token: "album-token", paid_at: "2026-01-01",
    },
  }));
  await page.route("**/api/gift/status?*", route => route.fulfill({ json: { status: "personalizing" } }));
  let retry;
  await page.route("**/api/gift/generate", async route => {
    retry = route.request().postDataJSON();
    await route.fulfill({ json: { status: "ready", deliveryMode: "link", deliveryToken: "album-token" } });
  });
  await page.goto(giftPath);
  await expect(page.getByRole("heading", { name: "Creando el álbum..." })).toBeVisible();
  await page.clock.fastForward(31000);
  await page.getByRole("button", { name: "Continuar con este regalo" }).click();
  await expect(page.getByRole("textbox", { name: "Copiar link de regalo" })).toHaveValue(/\/gift\/deliver\/album-token$/);
  expect(retry).toEqual({ giftId, locale: "es" });
});

test("an interrupted paid gift with no song configuration returns to personalization", async ({ page }) => {
  await page.route("**/rest/v1/gifts?*", route => route.fulfill({
    json: {
      pack_type: "learning", total_songs: 5, child_name: "—", language: "es",
      status: "personalizing", delivery_mode: "link", delivery_token: "album-token",
      gift_songs: [{ count: 0 }], paid_at: "2026-01-01",
    },
  }));
  await page.goto(giftPath);
  await page.getByPlaceholder(/Sofía/).fill("María");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "5 canciones para María" })).toBeVisible();
});

test("an expired startup can resume even when the album still says generating", async ({ page }) => {
  await page.clock.install();
  await page.route("**/rest/v1/gifts?*", route => route.fulfill({
    json: {
      pack_type: "learning", total_songs: 5, child_name: "Olivia", language: "es",
      status: "generating", delivery_mode: "link", delivery_token: "stalled-album",
      gift_songs: [{ count: 5 }], paid_at: "2026-01-01",
    },
  }));
  await page.route("**/api/gift/status?*", route => route.fulfill({
    json: { status: "generating", retryAvailable: true },
  }));
  await page.goto(giftPath);
  await expect(page.getByRole("heading", { name: "Creando el álbum..." })).toBeVisible();
  await page.clock.fastForward(31000);
  await expect(page.getByRole("button", { name: "Continuar con este regalo" })).toBeVisible();
});
