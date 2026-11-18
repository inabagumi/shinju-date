import { expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

// Provided by the MSW mock data (packages/msw-handlers): several videos have
// `歌枠` in their titles
const QUERY = "歌枠";
const ANOTHER_QUERY = "ゲーム";

// The first visit to a page of the search results can take a while on the
// development server, which compiles the page on demand
const NAVIGATION_TIMEOUT = 15_000;

/**
 * Records the queries sent to `/api/search-exit`, without recording them on
 * the server.
 */
async function recordSearchExits(context: BrowserContext): Promise<string[]> {
  const queries: string[] = [];

  await context.route("**/api/search-exit", async (route) => {
    const { query } = route.request().postDataJSON() as { query: string };

    queries.push(query);
    await route.fulfill({ status: 204 });
  });

  return queries;
}

function getVideoCards(page: Page) {
  return page
    .getByRole("main")
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { level: 3 }) });
}

async function openSearchResults(page: Page, query: string) {
  await page.goto(`/videos/${encodeURIComponent(query)}`);
  await expect(
    page.getByRole("heading", { level: 1, name: `『${query}』の検索結果` })
  ).toBeVisible({ timeout: NAVIGATION_TIMEOUT });
  await expect(getVideoCards(page).first()).toBeVisible();
  // Wait for the hydration, which starts tracking the search
  await page.waitForLoadState("networkidle");
}

async function goHome(page: Page) {
  await page
    .getByRole("banner")
    .getByRole("link", { exact: true, name: "SHINJU DATE" })
    .click();
  await expect(page).toHaveURL("/", { timeout: NAVIGATION_TIMEOUT });
}

test.describe("Search exit", () => {
  test("records an exit when moving to another page with a link", async ({
    context,
    page,
  }) => {
    const queries = await recordSearchExits(context);

    await openSearchResults(page, QUERY);
    await goHome(page);

    await expect.poll(() => queries).toEqual([QUERY]);
  });

  test("records an exit when searching for another query", async ({
    context,
    page,
  }) => {
    const queries = await recordSearchExits(context);

    await openSearchResults(page, QUERY);

    await page.getByRole("button", { name: "動画を検索" }).click();

    const searchInput = page
      .getByRole("dialog", { name: "検索" })
      .getByRole("searchbox");

    await searchInput.fill(ANOTHER_QUERY);
    await searchInput.press("Enter");

    await expect(page).toHaveURL(
      `/videos/${encodeURIComponent(ANOTHER_QUERY)}`,
      {
        timeout: NAVIGATION_TIMEOUT,
      }
    );
    await expect.poll(() => queries).toEqual([QUERY]);
  });

  test("does not record an exit when filtering the same search by a talent", async ({
    context,
    page,
  }) => {
    const queries = await recordSearchExits(context);

    await openSearchResults(page, QUERY);

    await page.getByRole("button", { exact: true, name: "タレント" }).click();
    await page.getByRole("checkbox", { name: "朝霧ミオ" }).click();
    await page.keyboard.press("Escape");

    await expect(page).toHaveURL(/[?&]talent=/, {
      timeout: NAVIGATION_TIMEOUT,
    });

    // Leaving afterwards records only one exit, for the search
    await goHome(page);

    await expect.poll(() => queries).toEqual([QUERY]);
  });

  test("does not record an exit after opening a video", async ({
    context,
    page,
  }) => {
    const queries = await recordSearchExits(context);

    // The video opens in a new tab
    await context.route(
      /^https:\/\/(?:www|clips)\.(?:youtube|twitch)\./,
      (route) => route.fulfill({ body: "", contentType: "text/html" })
    );

    await openSearchResults(page, QUERY);

    const popupPromise = page.waitForEvent("popup");
    await getVideoCards(page).first().click();
    await (await popupPromise).close();

    await goHome(page);
    await page.waitForLoadState("networkidle");

    expect(queries).toEqual([]);
  });
});
