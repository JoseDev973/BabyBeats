import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads at /es/auth/login", async ({ page }) => {
    await page.goto("/es/auth/login");
    await expect(page).toHaveURL(/\/es\/auth\/login/);
  });

  test("login shows email/password fields and Google button", async ({ page }) => {
    await page.goto("/es/auth/login");
    await expect(page.getByLabel(/[Ee]mail|[Cc]orreo/i).or(
      page.locator('input[type="email"]')
    ).first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Google/i }).or(
        page.getByText(/Google/i)
      ).first()
    ).toBeVisible();
  });

  test('login shows "Forgot password" link', async ({ page }) => {
    await page.goto("/es/auth/login");
    const forgotLink = page.getByText(/[Oo]lvid|[Ff]orgot/i);
    await expect(forgotLink.first()).toBeVisible();
  });

  test("signup page loads at /es/auth/signup", async ({ page }) => {
    await page.goto("/es/auth/signup");
    await expect(page).toHaveURL(/\/es\/auth\/signup/);
  });

  test("signup shows confirm password field", async ({ page }) => {
    await page.goto("/es/auth/signup");
    const passwordFields = page.locator('input[type="password"]');
    // Signup should have at least 2 password fields (password + confirm)
    await expect(passwordFields.nth(1)).toBeVisible();
  });

  test("link between login and signup works", async ({ page }) => {
    await page.goto("/es/auth/login");
    const signupLink = page.getByRole("link", { name: /[Rr]egist|[Ss]ign.?up|[Cc]rear cuenta/i });
    await signupLink.first().click();
    await expect(page).toHaveURL(/\/signup/);

    const loginLink = page.getByRole("link", { name: /[Ii]nici|[Ll]og.?in|[Ee]ntrar/i });
    await loginLink.first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});
