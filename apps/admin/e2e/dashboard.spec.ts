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

  test("should keep the period of the charts of the video summary in the URL", async ({
    page,
  }) => {
    await page.goto("/");

    const periods = page.getByRole("group", { name: "グラフの期間" });
    await periods.getByRole("button", { name: "過去30日間" }).click();

    await expect(page).toHaveURL(/\?period=30$/u);
    await expect(
      page.getByRole("heading", { name: "動画数の日別純増減（30日間）" })
    ).toBeVisible();

    await page.reload();

    await expect(
      periods.getByRole("button", { name: "過去30日間" })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("heading", { name: "動画数の日別純増減（30日間）" })
    ).toBeVisible();
  });
});
