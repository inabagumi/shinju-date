import { expect, test } from "@playwright/test";

test.describe("Announcements", () => {
  test("should display the announcements with their Markdown rendered", async ({
    page,
  }) => {
    await page.goto("/announcements");

    await expect(
      page.getByRole("heading", { level: 1, name: "お知らせ管理" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "新しいお知らせを追加" })
    ).toBeVisible();

    const row = page
      .getByRole("row")
      .filter({ hasText: "メンテナンスのお知らせ" });
    await expect(
      row.getByRole("link", { name: "メンテナンス情報" })
    ).toHaveAttribute("href", "https://example.com/maintenance");
    await expect(row.getByRole("deletion")).toHaveText("11月20日");
    await expect(row.getByRole("button", { name: "編集" })).toBeVisible();
  });
});
