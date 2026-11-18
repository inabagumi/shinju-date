import { expect, type Page, test } from "@playwright/test";

const TALENT_PARAM_PATTERN = /[?&]talent=[0-9a-f-]{36}/;

/** タレントの複数選択を開いて、指定したタレントを選ぶ */
async function selectTalent(page: Page, trigger: string, name: string) {
  await page.getByRole("button", { exact: true, name: trigger }).click();
  await page.getByRole("checkbox", { name }).click();
  await page.keyboard.press("Escape");
}

function getSelectedTalentList(page: Page) {
  return page.getByRole("list", { name: "選んでいるタレント" });
}

test.describe("Videos - Talent filter", () => {
  test("should filter the videos by the selected talents", async ({ page }) => {
    await page.goto("/videos");

    await expect(
      page.getByRole("button", { exact: true, name: "タレント" })
    ).toBeVisible();
    await expect(getSelectedTalentList(page)).toHaveCount(0);

    await selectTalent(page, "タレント", "朝霧ミオ");

    await expect(page).toHaveURL(TALENT_PARAM_PATTERN);
    await expect(
      getSelectedTalentList(page).getByText("朝霧ミオ")
    ).toBeVisible();
    await expect(page.locator("header p.tabular-nums")).toHaveText(
      /^[\d,]+件$/
    );

    // 開き直しても同じ条件になり、検索エンジンには載せない
    await page.reload();
    await expect(
      getSelectedTalentList(page).getByText("朝霧ミオ")
    ).toBeVisible();
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/
    );

    await selectTalent(page, "朝霧ミオ", "凪沢ユラ");

    await expect(page).toHaveURL(/talent=.+&talent=/);
    await expect(
      getSelectedTalentList(page).getByRole("link", { name: "絞り込みを解除" })
    ).toBeVisible();

    await getSelectedTalentList(page)
      .getByRole("link", { name: "凪沢ユラを外す" })
      .click();

    await expect(page).not.toHaveURL(/talent=.+&talent=/);
    await expect(
      getSelectedTalentList(page).getByText("凪沢ユラ")
    ).not.toBeVisible();

    await getSelectedTalentList(page)
      .getByRole("link", { name: "朝霧ミオを外す" })
      .click();

    await expect(page).toHaveURL(/\/videos$/);
    await expect(getSelectedTalentList(page)).toHaveCount(0);
  });

  test("should keep the talents when switching the kind", async ({ page }) => {
    await page.goto("/videos");

    await selectTalent(page, "タレント", "白露ネネ");
    await expect(page).toHaveURL(TALENT_PARAM_PATTERN);

    await page
      .getByRole("navigation", { name: "種別" })
      .getByRole("link", { name: "ショート" })
      .click();

    await expect(page).toHaveURL(/kind=short/);
    await expect(page).toHaveURL(TALENT_PARAM_PATTERN);
    await expect(
      getSelectedTalentList(page).getByText("白露ネネ")
    ).toBeVisible();
  });

  test("should ignore invalid talents", async ({ page }) => {
    const response = await page.goto(
      "/videos?talent=invalid&talent=00000000-0000-4000-8000-000000000000"
    );

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("button", { exact: true, name: "タレント" })
    ).toBeVisible();
    await expect(getSelectedTalentList(page)).toHaveCount(0);
    await expect(page.locator('head meta[name="robots"]')).not.toHaveAttribute(
      "content",
      /noindex/
    );
  });

  test("should not scroll horizontally on a narrow screen", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 320 });
    await page.goto("/videos");

    await selectTalent(page, "タレント", "朝霧ミオ");
    await expect(page).toHaveURL(TALENT_PARAM_PATTERN);

    const hasHorizontalScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );

    expect(hasHorizontalScroll).toBe(false);
  });
});
