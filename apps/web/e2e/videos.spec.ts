import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Provided by the MSW mock data (packages/msw-handlers): several videos have
// `歌枠` in their titles, and no video matches `NO_RESULTS_QUERY`.
const QUERY = "歌枠";
const NO_RESULTS_QUERY = "該当する動画のないキーワード";

// The first visit to a page of the search results can take a while on the
// development server, which compiles the page on demand
const NAVIGATION_TIMEOUT = 15_000;

// Video cards link to the video on YouTube or Twitch
const VIDEO_URL_PATTERN =
  /^https:\/\/(?:www\.youtube\.com\/watch\?v=|www\.twitch\.tv\/|clips\.twitch\.tv\/)./u;

/** Video cards are links that contain the heading of the video title */
const getVideoCards = (page: Page) => {
  const main = page.getByRole("main");

  return main
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { level: 3 }) });
};

/** The number of the videos found, shown under the heading */
const getResultCount = (page: Page) =>
  page.getByRole("main").getByText(/^[\d,]+件$/u);

test.describe("Videos page", () => {
  test("should list the videos by date", async ({ page }) => {
    await page.goto("/videos");

    await expect(page).toHaveTitle("動画一覧 - SHINJU DATE");
    await expect(
      page.getByRole("heading", { level: 1, name: "動画一覧" })
    ).toBeVisible();

    const cards = getVideoCards(page);

    await expect(cards.first()).toBeVisible();
    // The videos are grouped by date, each with its own heading
    await expect(
      page.getByRole("main").getByRole("heading", { level: 2 }).first()
    ).toBeVisible();

    const cardList = await cards.all();

    await Promise.all(
      cardList.flatMap((card) => [
        expect(card).toHaveAttribute("href", VIDEO_URL_PATTERN),
        expect(card).toHaveAttribute("target", "_blank"),
      ])
    );
  });

  test("should show only the videos that match the search", async ({
    page,
  }) => {
    await page.goto("/videos");
    await expect(getVideoCards(page).first()).toBeVisible();

    await page.getByRole("button", { name: "動画を検索" }).click();

    const searchInput = page
      .getByRole("dialog", { name: "検索" })
      .getByRole("searchbox");

    await searchInput.fill(QUERY);
    await searchInput.press("Enter");

    await expect(page).toHaveURL(`/videos/${encodeURIComponent(QUERY)}`, {
      timeout: NAVIGATION_TIMEOUT,
    });
    await expect(page).toHaveTitle(`『${QUERY}』の検索結果 - SHINJU DATE`);
    await expect(
      page.getByRole("heading", { level: 1, name: `『${QUERY}』の検索結果` })
    ).toBeVisible();

    const cards = getVideoCards(page);

    await expect(cards.first()).toBeVisible();

    // Every video shown has the keyword in its title (the labels in the
    // brackets are part of the name of the card)
    const count = await cards.count();

    const cardList = await cards.all();

    await Promise.all(
      cardList.map((card) =>
        expect(card).toHaveAccessibleName(new RegExp(QUERY, "u"))
      )
    );

    // The count under the heading matches the videos shown
    await expect(getResultCount(page)).toHaveText(`${count}件`);
  });

  test("should show the empty state when nothing matches", async ({ page }) => {
    await page.goto(`/videos/${encodeURIComponent(NO_RESULTS_QUERY)}`);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: `『${NO_RESULTS_QUERY}』の検索結果`,
      })
    ).toBeVisible();
    await expect(getResultCount(page)).toHaveText("0件");
    await expect(
      page.getByText(
        `『${NO_RESULTS_QUERY}』に一致する動画は見つかりませんでした。`
      )
    ).toBeVisible();
    await expect(getVideoCards(page)).toHaveCount(0);

    await page.getByRole("link", { name: "新着動画を見る" }).click();

    await expect(page).toHaveURL("/videos");
    await expect(getVideoCards(page).first()).toBeVisible();
  });
});

test.describe("Open Graph image of the videos page", () => {
  for (const [description, path] of [
    ["the videos page", "/videos"],
    // A catch-all segment cannot have an image, so the page takes over that
    // of `/videos`, which has no search terms in it
    ["the search results", `/videos/${encodeURIComponent(QUERY)}`],
  ] as const) {
    test(`should point to the image of the videos page for ${description}`, async ({
      page,
      request,
    }) => {
      await page.goto(path, { timeout: NAVIGATION_TIMEOUT });

      const ogImage = page.locator('meta[property="og:image"]');

      await expect(ogImage).toHaveAttribute(
        "content",
        /\/videos\/opengraph-image\?/u
      );
      await expect(
        page.locator('meta[property="og:image:alt"]')
      ).toHaveAttribute("content", "動画一覧");

      const response = await request.get(
        (await ogImage.getAttribute("content")) ?? ""
      );

      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
    });
  }
});
