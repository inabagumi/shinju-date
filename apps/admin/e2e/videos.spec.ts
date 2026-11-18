import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/** The rows of the video table, without the header row */
const videoRows = (page: Page) =>
  page.getByRole("table").getByRole("rowgroup").nth(1).getByRole("row");

test.describe("Videos", () => {
  for (const viewport of [
    { height: 844, name: "mobile", width: 390 },
    { height: 1000, name: "desktop", width: 1440 },
  ]) {
    test(`should display videos list with mock data (${viewport.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({
        height: viewport.height,
        width: viewport.width,
      });
      await page.goto("/videos");

      await expect(
        page.getByRole("heading", { level: 1, name: "動画管理" })
      ).toBeVisible();
      // Next.js may keep a hidden copy of streamed content in the DOM, so
      // only match the visible element.
      await expect(
        page.getByText(/全 [\d,]+ 件の動画/).filter({ visible: true })
      ).toBeVisible();

      const table = page.getByRole("table");
      await expect(
        table.getByRole("columnheader", { name: "タレント" })
      ).toBeVisible();

      // Rows rendered from MSW mock data
      const rows = videoRows(page);
      await expect(rows.first()).toBeVisible();
      await expect(table.getByText("動画がありません。")).toHaveCount(0);

      // The title links to the detail page and the talent relation is resolved
      const firstRow = rows.first();
      await expect(firstRow.getByRole("link").first()).toHaveAttribute(
        "href",
        /^\/videos\/[0-9a-f-]{36}$/
      );
      const talentCell = firstRow.getByRole("cell").nth(3);
      await expect(talentCell).not.toBeEmpty();
      await expect(talentCell).not.toHaveText("タレント不明");

      await expect(page.getByText("Application error")).toHaveCount(0);
    });
  }

  test("should display a video detail page from the list", async ({ page }) => {
    await page.goto("/videos");

    await videoRows(page).first().getByRole("link").first().click();

    await expect(page).toHaveURL(/\/videos\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
    await expect(page).toHaveTitle(/^(?!undefined).+ - 動画詳細 - /);
    await expect(page.getByText("Temporal error")).toHaveCount(0);
  });

  test("should list only the videos that match the filter", async ({
    page,
  }) => {
    await page.goto("/videos");

    await page
      .getByRole("button", { name: /^プラットフォームで絞り込み/ })
      .click();
    await page.getByRole("checkbox", { exact: true, name: "Twitch" }).click();
    await page.keyboard.press("Escape");

    await expect(page).toHaveURL(/[?&]platform=twitch(&|$)/);
    // The mock data has 6 Twitch videos
    await expect(
      page.getByText("全 6 件の動画").filter({ visible: true })
    ).toBeVisible();

    const rows = videoRows(page);
    await expect(rows).toHaveCount(6);
    await expect(rows.getByRole("cell", { name: /^Twitch / })).toHaveCount(6);
    await expect(rows.getByRole("cell", { name: /^YouTube / })).toHaveCount(0);
  });

  test("should toggle the visibility of the selected videos at once", async ({
    page,
  }) => {
    await page.goto("/videos?platform=twitch");

    const titles = [
      "【Twitch】深夜のゲーム配信アーカイブ",
      "【Twitch】アップロード動画：自己紹介",
    ];
    // The status column shows 非表示 for hidden videos
    const statusCell = (title: string) =>
      videoRows(page).filter({ hasText: title }).getByRole("cell").nth(8);
    const statusesBefore = await Promise.all(
      titles.map((title) => statusCell(title).textContent())
    );

    for (const title of titles) {
      await page.getByRole("checkbox", { name: `「${title}」を選択` }).check();
    }

    const toolbar = page.getByRole("toolbar", { name: "選択した動画の操作" });
    await expect(toolbar).toContainText("2 件選択中");
    await toolbar
      .getByRole("button", { name: "表示/非表示を切り替え" })
      .click();

    const dialog = page.getByRole("dialog", { name: "表示状態を切り替え" });
    for (const title of titles) {
      await expect(dialog).toContainText(title);
    }
    await dialog.getByRole("button", { name: "切り替える" }).click();

    await expect(
      page.getByRole("region").getByText("2 件の動画の表示状態を更新しました。")
    ).toBeVisible();
    await expect(toolbar).toContainText(
      "動画を選択すると、まとめて操作できます。"
    );
    for (const [index, title] of titles.entries()) {
      await expect(statusCell(title)).not.toHaveText(
        statusesBefore[index] ?? ""
      );
    }
  });
});
