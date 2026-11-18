import { expect, test } from "@playwright/test";

test.describe("Contact page", () => {
  test("should load the contact page", async ({ page }) => {
    await page.goto("/contact");

    await expect(
      page.getByRole("heading", { level: 1, name: "お問い合わせ" })
    ).toBeVisible();
  });
});
