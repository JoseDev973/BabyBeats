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

test("retains the chosen language and destination between login and signup", async ({ page }) => {
  await page.goto("/fr/create");
  await expect(page).toHaveURL(/\/fr\/auth\/login\?next=/);
  await page.locator('main a[href*="/auth/signup"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get("next")).toBe("/fr/create");
  await page.locator('main a[href*="/auth/login"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get("next")).toBe("/fr/create");
});

test("returns the recovery email to the new password form and shows delivery errors", async ({ page }) => {
  let returnTo: URL | undefined;
  let attempt = 0;
  await page.route("**/auth/v1/recover**", async (route) => {
    returnTo = new URL(new URL(route.request().url()).searchParams.get("redirect_to")!);
    attempt++;
    await route.fulfill({
      status: attempt === 1 ? 429 : 200,
      json: attempt === 1 ? { message: "Try again later" } : {},
    });
  });
  await page.goto("/en/auth/login");
  await page.locator('input[type="email"]').fill("listener@example.test");
  const forgot = page.getByRole("button", { name: /forgot/i });
  await forgot.click();
  await expect(page.getByRole("alert").filter({ hasText: "Try again later" })).toBeVisible();
  await forgot.click();
  await expect(page.getByRole("status")).toContainText(/check your inbox/i);
  expect(returnTo?.pathname).toBe("/auth/callback");
  expect(returnTo?.searchParams.get("next")).toBe("/en/auth/reset-password");
});

test("expired confirmation links explain how to recover in the original language", async ({ page }) => {
  await page.goto("/auth/callback?next=/pt/auth/reset-password");
  await expect(page).toHaveURL(/\/pt\/auth\/login\?error=auth_failed/);
  await expect(page.getByRole("alert").filter({ hasText: /link não é mais válido/i })).toBeVisible();
});

test("shows Google signup failures after requesting email confirmation", async ({ page }) => {
  await page.route("**/auth/v1/signup**", (route) => route.fulfill({
    json: { id: "00000000-0000-4000-8000-000000000001", email: "listener@example.test", identities: [] },
  }));
  await page.goto("/en/auth/signup");
  await page.locator('input[type="email"]').fill("listener@example.test");
  await page.locator('input[type="password"]').first().fill("fixture-password");
  await page.locator('input[type="password"]').last().fill("fixture-password");
  await page.locator('main button[type="submit"]').click();
  await expect(page.getByRole("status")).toContainText(/check your inbox/i);

  // Force a local OAuth initialization failure before any redirect to Google.
  await page.evaluate(() => {
    crypto.subtle.digest = async () => { throw new Error("Local WebCrypto failure"); };
  });
  await page.getByRole("button", { name: /google/i }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(/could not connect to Google/i);
});
