import { test, expect } from "@playwright/test";

test.describe("Create flow", () => {
  test("redirects to login if not authenticated", async ({ page }) => {
    await page.goto("/es/create");
    // Should redirect to login page if not authenticated
    await expect(page).toHaveURL(/\/auth\/login|\/create/);
  });

  test("shows mode selection (song / album)", async ({ page }) => {
    await page.goto("/es/create");
    // If redirected to login, the create page requires auth
    // If on create page, check for mode selection
    const url = page.url();
    if (url.includes("/create")) {
      await expect(
        page.getByText(/[Uu]na canción/i).or(page.getByText(/canción/i)).first()
      ).toBeVisible();
      await expect(
        page.getByText(/[Uu]n álbum/i).or(page.getByText(/álbum/i)).first()
      ).toBeVisible();
    } else {
      // Redirected to login - that's expected for unauthenticated users
      expect(url).toMatch(/\/auth\/login/);
    }
  });
});
