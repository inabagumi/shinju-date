import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

// Seeded by the MSW mock data (packages/msw-handlers): a stream on air now,
// 2 streams on each day of the current week (one of them at 21:00 in Japan),
// 1 in each of the previous and the next weeks, and 2 from 23:30 that cross
// 00:00. The title is `【スケジュール】ただいま配信中`, and the item shows it
// without the label in 【】
const LIVE_VIDEO_TITLE = "ただいま配信中";

/** From 23:30 on Thursday of the current week to Friday */
const THURSDAY_NIGHT_TITLE = "木曜の深夜配信";

/** From 23:30 on Saturday of the current week to Sunday of the next week */
const SATURDAY_NIGHT_TITLE = "土曜の深夜配信";

const WEEK_PATH_PATTERN = /^\/schedule\/(?<weekStart>\d{4}-\d{2}-\d{2})$/u;

/** `YYYY-MM-DD` that is `days` days after `date` */
const addDays = (date: string, days: number): string => {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
};

/** The right edge of a box (0 for the missing parts) */
const getRightEdge = (
  box: Awaited<ReturnType<Locator["boundingBox"]>>
): number => (box?.x ?? 0) + (box?.width ?? 0);

const getMain = (page: Page) => page.getByRole("main");

const getWeekNavigation = (page: Page) =>
  page.getByRole("navigation", { name: "週の移動" });

const getDays = (page: Page) => getMain(page).getByTestId("schedule-day");

const getItems = (page: Page) => getMain(page).getByTestId("schedule-item");

const getWeekLink = (page: Page, name: string) =>
  getWeekNavigation(page).getByRole("link", { exact: true, name });

const getLinkPath = async (page: Page, name: string): Promise<string> => {
  const href = await getWeekLink(page, name).getAttribute("href");

  if (!href) {
    throw new Error(`The link "${name}" has no href`);
  }

  return href;
};

/** The Sunday (`YYYY-MM-DD`) of the current week */
const getCurrentWeekStart = async (page: Page): Promise<string> => {
  await page.goto("/schedule");

  const previousPath = await getLinkPath(page, "前の週");
  const { weekStart: previousWeekStart = "" } =
    previousPath.match(WEEK_PATH_PATTERN)?.groups ?? {};

  return addDays(previousWeekStart, 7);
};

const expectNotFound = async (page: Page) => {
  await expect(
    page.getByRole("heading", { level: 1, name: "ページが見つかりません" })
  ).toBeVisible();
};

const expectNoHorizontalScroll = async (page: Page) => {
  const { clientWidth, scrollWidth } = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
};

test.describe("Schedule page", () => {
  test("should show the 7 days of the current week with today marked", async ({
    page,
  }) => {
    await page.goto("/schedule");

    await expect(page).toHaveTitle("配信スケジュール - SHINJU DATE");
    await expect(
      getMain(page).getByRole("heading", {
        level: 1,
        name: "配信スケジュール",
      })
    ).toBeVisible();
    await expect(getDays(page)).toHaveCount(7);
    await expect(getMain(page).locator('[aria-current="date"]')).toHaveCount(1);
    await expect(
      getMain(page).getByText("今日", { exact: true })
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/schedule$/u
    );
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

    const liveItem = getItems(page).filter({ hasText: LIVE_VIDEO_TITLE });

    await expect(liveItem).toBeVisible();
    await expect(
      liveItem.getByText("配信中", { exact: true }).filter({ visible: true })
    ).toBeVisible();
    await expect(liveItem).toHaveAttribute(
      "href",
      /^https:\/\/www\.youtube\.com\/watch\?v=/u
    );
    await expect(liveItem).toHaveAttribute("ping", "/api/ping");
    await expect(liveItem).toHaveAttribute("target", "_blank");
    await expect(liveItem).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("should place the videos on the time axis of 24 hours", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto("/schedule");
    await expect(getItems(page).first()).toBeVisible();

    // Every day of the current week has a stream at 21:00, at the same height
    const days = await getDays(page).all();
    const tops = await Promise.all(
      days.map(async (day) => {
        const box = await day
          .locator('[data-start="21:00"]')
          .first()
          .boundingBox();

        return Math.round(box?.y ?? -1);
      })
    );

    expect(new Set(tops).size).toBe(1);

    // An hour is 64px, so 21:00 is 21 hours below 00:00 (the top of the day)
    const sunday = getDays(page).first();
    const body = await sunday.locator("ul").boundingBox();
    const itemAt21 = await sunday.locator('[data-start="21:00"]').boundingBox();

    expect(Math.round((itemAt21?.y ?? 0) - (body?.y ?? 0))).toBe(21 * 64);
  });

  test("should draw a live stream for an hour", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto("/schedule");

    const live = getMain(page)
      .locator("li")
      .filter({
        has: page.getByTestId("schedule-item").filter({
          hasText: LIVE_VIDEO_TITLE,
        }),
      });

    // 64px for an hour. The mock starts the live stream within today, so the
    // hour is not cut at the end of the day whenever the test runs (the cut
    // is checked by the unit tests of `layoutDay`)
    const liveBox = await live.boundingBox();

    expect(Math.round(liveBox?.height ?? 0)).toBe(64);
  });

  test("should draw an ended stream as long as it was", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });

    // Every stream of the previous week has ended, and lasted 1.5 hours
    const currentWeekStart = await getCurrentWeekStart(page);

    await page.goto(`/schedule/${addDays(currentWeekStart, -7)}`);

    const item = getMain(page)
      .locator("li")
      .filter({
        has: page.getByTestId("schedule-item").filter({ hasText: /#15$/u }),
      });

    const itemBox = await item.boundingBox();

    expect(Math.round(itemBox?.height ?? 0)).toBe(96);
  });

  test("should put the videos that overlap side by side", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto("/schedule");
    await expect(getItems(page).first()).toBeVisible();

    // 4 streams start at 21:00 on Wednesday of the current week
    // Weeks start on Sunday
    const wednesday = getDays(page).nth(3);
    const items = wednesday.locator('[data-start="21:00"]');

    await expect(items).toHaveCount(4);

    const itemList = await items.all();
    const boxes = await Promise.all(itemList.map((item) => item.boundingBox()));

    expect(new Set(boxes.map((box) => Math.round(box?.y ?? -1))).size).toBe(1);
    expect(new Set(boxes.map((box) => Math.round(box?.x ?? -1))).size).toBe(4);

    // Hovering an item expands it to the right, keeping its left edge and the
    // place of its icon, and shows the whole title
    const item = items.nth(1);
    const icon = item.locator('[data-testid^="talent-"]');
    // Scroll first, as hovering scrolls the item into view
    await item.scrollIntoViewIfNeeded();

    const dayBox = await wednesday.boundingBox();
    const itemBefore = await item.boundingBox();
    const iconBefore = await icon.boundingBox();

    await item.hover();

    const itemAfter = await item.boundingBox();
    const iconAfter = await icon.boundingBox();

    expect(itemAfter?.x).toBe(itemBefore?.x);
    expect(itemAfter?.y).toBe(itemBefore?.y);
    expect(iconAfter).toEqual(iconBefore);
    expect(itemAfter?.width ?? 0).toBeGreaterThan(itemBefore?.width ?? 0);
    // At least to the right end of the day
    expect(Math.round(getRightEdge(itemAfter))).toBeGreaterThanOrEqual(
      Math.round(getRightEdge(dayBox) - 4)
    );

    // The shadow is on the item itself, so the parts match
    const placement = item.locator("xpath=..");

    const placementBox = await placement.boundingBox();

    expect(placementBox?.height).toBeCloseTo((itemAfter?.height ?? 0) + 2, 0);

    // So does focusing it with the keyboard
    await page.mouse.move(0, 0);

    const first = items.first();

    await first.scrollIntoViewIfNeeded();

    const firstBefore = await first.boundingBox();

    await first.focus();

    const firstAfter = await first.boundingBox();

    expect(firstAfter?.width ?? 0).toBeGreaterThan(firstBefore?.width ?? 0);
  });

  test("should show a stream that crosses 00:00 on the next day too", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto("/schedule");

    // Weeks start on Sunday
    const thursday = getDays(page).nth(4);
    const friday = getDays(page).nth(5);
    const first = thursday
      .getByTestId("schedule-item")
      .filter({ hasText: THURSDAY_NIGHT_TITLE });
    const next = friday
      .getByTestId("schedule-item")
      .filter({ hasText: THURSDAY_NIGHT_TITLE });

    await expect(first).toHaveAttribute("data-start", "23:30");
    await expect(first.locator("time")).toHaveText("23:30");
    // The part on Friday starts at 00:00, with the date of the start
    await expect(next).toHaveAttribute("data-start", "00:00");
    await expect(next.locator("time")).toHaveText(/^\d{2}\/\d{2} 23:30$/u);
    // Both link to the same stream
    expect(await next.getAttribute("href")).toBe(
      await first.getAttribute("href")
    );

    // At the top of the day, as tall as the part after 00:00 (30 minutes for
    // an upcoming stream, or an hour for an ended one)
    const body = await friday.locator("ul").boundingBox();
    const nextBox = await next.boundingBox();

    expect(Math.round((nextBox?.y ?? -1) - (body?.y ?? 0))).toBe(0);

    // It expands like the other items
    await next.scrollIntoViewIfNeeded();

    const widthBefore = nextBox?.width ?? 0;

    await next.hover();

    const expandedBox = await next.boundingBox();

    expect(expandedBox?.width ?? 0).toBeGreaterThan(widthBefore);

    // A stream from Saturday is on Sunday of the next week too
    const currentWeekStart = await getCurrentWeekStart(page);

    await page.goto(`/schedule/${addDays(currentWeekStart, 7)}`);

    await expect(
      getDays(page)
        .first()
        .getByTestId("schedule-item")
        .filter({ hasText: SATURDAY_NIGHT_TITLE })
    ).toHaveAttribute("data-continued", "true");
  });

  test("should keep every item inside the column of its day", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto("/schedule");
    await expect(getItems(page).first()).toBeVisible();

    const overflows = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="schedule-day"]')].flatMap(
        (day) => {
          const { left, right } = day.getBoundingClientRect();

          return [...day.querySelectorAll('[data-testid="schedule-item"]')]
            .map((item) => item.getBoundingClientRect())
            .filter((box) => box.left < left - 1 || box.right > right + 1);
        }
      )
    );

    expect(overflows).toHaveLength(0);
  });

  test("should keep the dates on the screen while scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 600, width: 1280 });
    await page.goto("/schedule");
    await expect(getItems(page).first()).toBeVisible();

    await getMain(page)
      .locator('[data-start="21:00"]')
      .first()
      .scrollIntoViewIfNeeded();

    const heading = getDays(page).first().getByRole("heading", { level: 2 });

    await expect(heading).toBeInViewport();

    // Right below the header of the site (56px)
    const headingBox = await heading.boundingBox();

    expect(Math.round(headingBox?.y ?? 0)).toBeLessThan(120);
  });

  test("should move between the weeks with the Sunday URLs", async ({
    page,
  }) => {
    const currentWeekStart = await getCurrentWeekStart(page);
    const previousWeekStart = addDays(currentWeekStart, -7);
    const nextWeekStart = addDays(currentWeekStart, 7);

    expect(await getLinkPath(page, "次の週")).toBe(
      `/schedule/${nextWeekStart}`
    );
    expect(await getLinkPath(page, "今週")).toBe("/schedule");

    await getWeekLink(page, "前の週").click();

    await expect(page).toHaveURL(`/schedule/${previousWeekStart}`);
    await expect(getMain(page).locator('[aria-current="date"]')).toHaveCount(0);
    // The stream seeded in the previous week
    await expect(getItems(page)).not.toHaveCount(0);

    await getWeekLink(page, "次の週").click();

    await expect(page).toHaveURL(`/schedule/${currentWeekStart}`);
    await expect(getMain(page).locator('[aria-current="date"]')).toHaveCount(1);

    await getWeekLink(page, "今週").click();

    await expect(page).toHaveURL("/schedule");
  });

  test("should show the week of a date that is not a Sunday", async ({
    page,
  }) => {
    const currentWeekStart = await getCurrentWeekStart(page);
    const wednesday = addDays(currentWeekStart, 3);

    await page.goto(`/schedule/${wednesday}`);

    await expect(getDays(page)).toHaveCount(7);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`/schedule/${currentWeekStart}$`, "u")
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/u
    );
    await expect(page).toHaveTitle(
      /^\d{4}年\d+月\d+日〜.+の配信スケジュール - SHINJU DATE$/u
    );
    await expect(getDays(page).first()).toHaveAttribute(
      "id",
      `day-${currentWeekStart}`
    );
  });

  test("should show up to 4 weeks after the current week", async ({ page }) => {
    const currentWeekStart = await getCurrentWeekStart(page);
    const lastWeekStart = addDays(currentWeekStart, 28);

    await page.goto(`/schedule/${lastWeekStart}`);

    await expect(getDays(page)).toHaveCount(7);
    // No link to the week that cannot be shown
    await expect(getWeekLink(page, "前の週")).toBeVisible();
    await expect(getWeekLink(page, "次の週")).toHaveCount(0);

    await page.goto(`/schedule/${addDays(lastWeekStart, 7)}`);

    await expectNotFound(page);
  });

  test("should not show the weeks before the oldest video", async ({
    page,
  }) => {
    await page.goto("/schedule/2000-01-03");

    await expectNotFound(page);
  });

  for (const value of ["2026-02-30", "2026-W46", "today"]) {
    test(`should show the not-found page for ${value}`, async ({ page }) => {
      await page.goto(`/schedule/${value}`);

      await expectNotFound(page);
    });
  }

  test("should put the 7 days side by side on a wide screen", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto("/schedule");

    await expect(getDays(page)).toHaveCount(7);
    await expect(page.getByRole("navigation", { name: "曜日" })).toBeHidden();

    const days = await getDays(page).all();
    const boxes = await Promise.all(days.map((day) => day.boundingBox()));

    expect(new Set(boxes.map((box) => Math.round(box?.y ?? -1))).size).toBe(1);
    await expectNoHorizontalScroll(page);
  });

  for (const width of [375, 768]) {
    test(`should stack the days with the band of weekdays (${width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 844, width });
      await page.goto("/schedule");

      await expect(getDays(page)).toHaveCount(7);

      const days = await getDays(page).all();
      const boxes = await Promise.all(days.map((day) => day.boundingBox()));
      const tops = boxes.map((box) => box?.y ?? -1);

      expect(new Set(boxes.map((box) => Math.round(box?.x ?? -1))).size).toBe(
        1
      );
      expect(tops).toEqual(tops.toSorted((a, b) => a - b));
      await expectNoHorizontalScroll(page);

      const band = page.getByRole("navigation", { name: "曜日" });
      const links = band.getByRole("link");

      await expect(links).toHaveCount(7);

      const sundayHref = await links.last().getAttribute("href");

      expect(sundayHref).toMatch(/^#day-\d{4}-\d{2}-\d{2}$/u);

      await links.last().click();

      await expect(page).toHaveURL(new RegExp(`${sundayHref}$`, "u"));
      await expect(getDays(page).last()).toBeInViewport();
    });
  }

  test("should be linked from the navigation, the footer and the home page", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto("/");

    await expect(
      page
        .getByRole("banner")
        .getByRole("link", { exact: true, name: "スケジュール" })
    ).toHaveAttribute("href", "/schedule");
    await expect(
      page
        .getByRole("contentinfo")
        .getByRole("link", { exact: true, name: "スケジュール" })
    ).toHaveAttribute("href", "/schedule");

    await page
      .getByRole("region", { name: "配信予定" })
      .getByRole("link", { name: "スケジュールを見る" })
      .click();

    await expect(page).toHaveURL("/schedule");
  });
});
