import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

// Provided by the MSW mock data (packages/msw-handlers). The titles are shown
// without the labels in the brackets (`【…】`).
const LIVE_VIDEO_TITLES = ["ただいま配信中", "まったり雑談配信中"];
// A Twitch stream that starts 20 hours later
const UPCOMING_VIDEO_TITLE = "明日の夜は耐久配信！";
// A Twitch clip published 9 hours ago
const RECENT_VIDEO_TITLE = "奇跡のワンプレイ";

// Video cards link to the video on YouTube or Twitch
const VIDEO_URL_PATTERN =
  /^https:\/\/(?:www\.youtube\.com\/watch\?v=|www\.twitch\.tv\/|clips\.twitch\.tv\/)./;

const getSection = (page: Page, name: string) =>
  page.getByRole("main").getByRole("region", { exact: true, name });

/**
 * Video cards are links that contain the heading of the video title. The
 * locator in `has` is matched inside each link, so it starts from the page.
 */
const getVideoCards = (scope: Locator) =>
  scope.getByRole("link").filter({ has: scope.page().getByRole("heading") });

const getVideoCard = (scope: Locator, title: string) =>
  scope.getByRole("link").filter({
    has: scope.page().getByRole("heading", { exact: true, name: title }),
  });

test.describe("Home page", () => {
  test("should show the title and the navigation", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/^SHINJU DATE - /);
    await expect(
      page.getByRole("heading", { level: 1, name: "SHINJU DATE" })
    ).toBeVisible();

    const navigation = page
      .getByRole("banner")
      .getByRole("navigation", { name: "メイン" });

    for (const name of [
      "SHINJU DATEとは",
      "スケジュール",
      "動画一覧",
      "タレント一覧",
    ]) {
      await expect(navigation.getByRole("link", { name })).toBeVisible();
    }
  });

  test("should show the live videos", async ({ page }) => {
    await page.goto("/");

    const section = getSection(page, "配信中");

    await expect(
      section.getByRole("heading", { level: 2, name: "配信中" })
    ).toBeVisible();

    for (const title of LIVE_VIDEO_TITLES) {
      await expect(getVideoCard(section, title)).toBeVisible();
    }

    const cards = getVideoCards(section);

    await expect(section.getByText(/^\d+件$/)).toHaveText(
      `${await cards.count()}件`
    );
  });

  test("should show the upcoming videos by date", async ({ page }) => {
    await page.goto("/");

    const section = getSection(page, "配信予定");

    await expect(getVideoCard(section, UPCOMING_VIDEO_TITLE)).toBeVisible();
    // The videos are grouped by date, each with its own heading
    await expect(
      section.getByRole("heading", { level: 3 }).first()
    ).toBeVisible();
    await expect(
      section.getByRole("link", { name: "スケジュールを見る" })
    ).toHaveAttribute("href", "/schedule");
  });

  test("should show the recent videos", async ({ page }) => {
    await page.goto("/");

    const section = getSection(page, "新着動画");

    await expect(getVideoCard(section, RECENT_VIDEO_TITLE)).toBeVisible();
    await expect(section.getByText("新着動画はありません")).toBeHidden();
  });

  test("should link the video cards to YouTube or Twitch", async ({ page }) => {
    await page.goto("/");

    // Wait for the cards of every section
    for (const name of ["配信中", "配信予定", "新着動画", "ショート"]) {
      await expect(getVideoCards(getSection(page, name)).first()).toBeVisible();
    }

    const cards = await getVideoCards(page.getByRole("main")).all();

    expect(cards.length).toBeGreaterThan(0);

    for (const card of cards) {
      await expect(card).toHaveAttribute("href", VIDEO_URL_PATTERN);
      await expect(card).toHaveAttribute("target", "_blank");
      await expect(card).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  test("should open the video list from the header", async ({ page }) => {
    await page.goto("/");

    // The footer links to the same page, so the search is scoped to the header
    await page
      .getByRole("banner")
      .getByRole("link", { name: "動画一覧" })
      .click();

    await expect(page).toHaveURL("/videos");
    await expect(
      page.getByRole("heading", { level: 1, name: "動画一覧" })
    ).toBeVisible();
  });

  test("should open the video list from the recent videos", async ({
    page,
  }) => {
    await page.goto("/");

    await getSection(page, "新着動画")
      .getByRole("link", { name: "動画一覧を見る" })
      .click();

    await expect(page).toHaveURL("/videos");
    await expect(
      page.getByRole("heading", { level: 1, name: "動画一覧" })
    ).toBeVisible();
  });
});
