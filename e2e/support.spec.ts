import { expect, test } from "@playwright/test";

test("a visitor can retry a support message without retyping it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let attempts = 0;
  await page.route("**/api/support", async route => {
    expect(route.request().postDataJSON()).toEqual({
      email: "familia@example.com",
      message: "¿Dónde encuentro mi canción?",
    });
    attempts++;
    await route.fulfill({ status: attempts === 1 ? 502 : 204 });
  });

  await page.goto("/es/privacy");
  const help = page.getByRole("button", { name: "Ayuda", exact: true });
  await help.click();
  const dialog = page.getByRole("dialog");
  const send = dialog.getByRole("button", { name: "Enviar mensaje" });
  await send.click();
  await expect(dialog.getByLabel("Tu correo")).toBeFocused();
  await dialog.getByLabel("Tu correo").fill("familia@example.com");
  await dialog.getByLabel("Tu mensaje").fill("¿Dónde encuentro mi canción?");
  await send.click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await send.click();
  await expect(dialog.getByRole("status")).toContainText("familia@example.com");
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  await help.click();
  await expect(dialog.getByLabel("Tu mensaje")).toBeEmpty();
});
