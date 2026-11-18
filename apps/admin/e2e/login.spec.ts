import { expect, test } from "@playwright/test";

// These tests start without the saved session, so that they can check the
// login page itself.

test.describe("Login", () => {
  test("should display the login form", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { level: 1, name: "Admin UI" })
    ).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("パスワード")).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });

  test("should sign in and return to the requested page", async ({ page }) => {
    await page.goto("/videos");

    // Pages that need a session redirect to the login page
    await expect(page).toHaveURL(/\/login\?next=%2Fvideos$/);

    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("password123");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/videos$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "動画管理" })
    ).toBeVisible();
  });

  test("should show an error for a wrong password", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("wrong-password");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "メールアドレスかパスワードが正しくありません。" })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("should sign out from the user menu", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("password123");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "ダッシュボード" })
    ).toBeVisible();

    await page.getByRole("button", { name: "ユーザーメニュー" }).click();
    await page.getByRole("menuitem", { name: "ログアウト" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Admin UI" })
    ).toBeVisible();

    // The session is gone, so the dashboard redirects to the login page
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });
});
