import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Opens the detail page of the first talent in the list */
const openFirstTalent = async (page: Page) => {
  await page.goto("/talents");

  // The first row is the header
  await page.getByRole("row").nth(1).getByRole("link").first().click();
  await expect(page).toHaveURL(/\/talents\/[0-9a-f-]{36}$/);
};

test.describe("Talents", () => {
  test("should display a talent detail page from the list", async ({
    page,
  }) => {
    await openFirstTalent(page);

    await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
    await expect(page).toHaveTitle(/^(?!undefined).+ - タレント詳細 - /);
    await expect(page.getByText("Temporal error")).toHaveCount(0);
  });

  test("should create a talent and retire it from the list", async ({
    page,
  }) => {
    await page.goto("/talents");

    // Unique per run, since the mock database keeps the talents between runs
    const name = `E2E タレント ${crypto.randomUUID()}`;

    await page.getByRole("button", { name: "新しいタレントを追加" }).click();
    const dialog = page.getByRole("dialog", { name: "新しいタレントを追加" });
    await dialog.getByLabel("タレント名").fill(name);
    await dialog.getByRole("button", { exact: true, name: "追加" }).click();
    await expect(dialog).toBeHidden();

    const row = page.getByRole("row").filter({
      has: page.getByRole("link", { exact: true, name }),
    });
    await expect(row).toBeVisible();
    await expect(row).toContainText("アクティブ");

    await page.getByRole("button", { name: `「${name}」の操作` }).click();
    await page.getByRole("menuitem", { name: "引退にする" }).click();

    const retireDialog = page.getByRole("dialog", {
      name: "タレントを引退にする",
    });
    await expect(retireDialog).toContainText(
      `タレント「${name}」を引退にしますか？`
    );
    await retireDialog.getByRole("button", { name: "引退にする" }).click();

    await expect(
      page.getByRole("region").getByText("タレントを引退にしました。")
    ).toBeVisible();
    await expect(row).toContainText("引退");
  });

  test("should confirm a lifecycle change from the list in a dialog", async ({
    page,
  }) => {
    await page.goto("/talents");

    await page
      .getByRole("button", { name: /^「.+」の操作$/ })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "削除" }).click();

    const dialog = page.getByRole("dialog", { name: "タレントを削除" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/タレント「.+」を削除しますか？/);

    await dialog.getByRole("button", { name: "キャンセル" }).click();
    await expect(dialog).toBeHidden();
  });

  test("should confirm a lifecycle change from the detail page in a dialog", async ({
    page,
  }) => {
    await openFirstTalent(page);

    await page.getByRole("button", { exact: true, name: "削除" }).click();

    const dialog = page.getByRole("dialog", { name: "タレントを削除" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/タレント「.+」を削除しますか？/);

    await dialog.getByRole("button", { name: "キャンセル" }).click();
    await expect(dialog).toBeHidden();
  });

  test("should filter and sort the list on the server through the URL", async ({
    page,
  }) => {
    await page.goto("/talents");

    await page
      .getByRole("combobox", { name: "状態で絞り込み" })
      .selectOption("all");
    await expect(page).toHaveURL(/\/talents\?status=all$/);

    const sortHeader = page.getByRole("columnheader", { name: /最終更新日時/ });
    await expect(sortHeader).toHaveAttribute("aria-sort", "descending");
    await sortHeader.getByRole("link").click();
    await expect(page).toHaveURL(/\/talents\?status=all&sort=asc$/);
    await expect(sortHeader).toHaveAttribute("aria-sort", "ascending");

    // The filters stay after a reload
    await page.reload();
    await expect(
      page.getByRole("combobox", { name: "状態で絞り込み" })
    ).toHaveValue("all");
    await expect(sortHeader).toHaveAttribute("aria-sort", "ascending");

    // Searching a name that no talent has shows the empty state
    await page
      .getByRole("searchbox", { name: "タレント名またはIDで検索" })
      .fill(`none-${crypto.randomUUID()}`);
    await expect(page.getByText("検索結果がありません。")).toBeVisible();
  });
});
