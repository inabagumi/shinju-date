import { expect, test } from "@playwright/test";

test.describe("Dashboard", () => {
  test("should display the summaries and the popular videos", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "ダッシュボード" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^総動画数 \d+/u })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^総タレント数 \d+/u })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^本日のクリック数 \d+/u })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "人気動画ランキング (過去30日間)",
      })
    ).toBeVisible();
    // Each video of the ranking links to its detail page
    await expect(
      page
        .getByRole("listitem")
        .filter({ has: page.getByRole("link", { name: "詳細" }) })
        .first()
    ).toBeVisible();
  });
});
