import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

// Seeded by the MSW mock data (packages/msw-handlers): a stream on air now,
// 2 streams on each day of the current week (one of them at 21:00 in Japan)
// and 1 in each of the previous and the next weeks. The title is
// `【スケジュール】ただいま配信中`, and the item shows it without the label in 【】
const LIVE_VIDEO_TITLE = "ただいま配信中";

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

/** Scroll the item to the middle of the screen, below the sticky headers */
const scrollToMiddle = async (item: Locator) => {
  await item.evaluate((element) => {
    element.scrollIntoView({ block: "center" });
  });
};

/**
 * Whether the item is the topmost element at the point (relative to its top
 * left corner), so that the pointer reaches it there
 */
const isTopmostAt = (item: Locator, x: number, y: number): Promise<boolean> =>
  item.evaluate(
    (element, point) => {
      const { left, top } = element.getBoundingClientRect();

      return (
        document
          .elementFromPoint(left + point.x, top + point.y)
          ?.closest('[data-testid="schedule-item"]') === element
      );
    },
    { x, y }
  );

/** Whether the item is the topmost element at its center */
const isTopmostAtCenter = (item: Locator): Promise<boolean> =>
  item.evaluate((element) => {
    const { height, left, top, width } = element.getBoundingClientRect();

    return (
      document
        .elementFromPoint(left + width / 2, top + height / 2)
        ?.closest('[data-testid="schedule-item"]') === element
    );
  });

/**
 * Open the schedule of the current week on a wide screen, where 4 streams
 * start at 21:00 on Wednesday, and scroll to them
 */
const openWednesdayAt21 = async (page: Page) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/schedule");
  await expect(getItems(page).first()).toBeVisible();

  // Weeks start on Sunday
  const day = getDays(page).nth(3);
  const items = day.locator('[data-start="21:00"]');

  await expect(items).toHaveCount(4);
  await scrollToMiddle(items.first());

  return { day, items };
};

/** The narrowest an item can be (`OVERLAP_FRONT_MIN_WIDTH`) */
const MIN_ITEM_WIDTH = 80;

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

  test("should give the whole width of the day to a video that overlaps nothing", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto("/schedule");
    await expect(getItems(page).first()).toBeVisible();

    // Only 1 stream starts at 21:00 on Sunday of the current week
    const sunday = getDays(page).first();
    const placement = sunday.locator("li").filter({
      has: page.locator('[data-start="21:00"]'),
    });

    await expect(placement).toHaveCount(1);
    await expect(placement).toHaveAttribute("data-columns", "1");

    const body = await sunday.locator("ul").boundingBox();
    const box = await placement.boundingBox();

    expect(box?.x).toBe(body?.x);
    expect(box?.width).toBe(body?.width);
  });

  test("should overlap the videos that start at the same time", async ({
    page,
  }) => {
    const { day, items } = await openWednesdayAt21(page);
    const itemList = await items.all();
    const boxes = await Promise.all(itemList.map((item) => item.boundingBox()));
    const lefts = boxes.map((box) => box?.x ?? -1);

    expect(new Set(boxes.map((box) => Math.round(box?.y ?? -1))).size).toBe(1);
    // Shifted to the right in turn, not split into 4 narrow columns
    expect(new Set(lefts.map(Math.round)).size).toBe(4);
    expect(lefts).toEqual(lefts.toSorted((a, b) => a - b));

    const dayBox = await day.boundingBox();
    const dayWidth = dayBox?.width ?? 0;
    const dayRight = Math.round(getRightEdge(dayBox) - 4);

    for (const box of boxes) {
      expect(box?.width ?? 0).toBeGreaterThan(dayWidth / 4);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_ITEM_WIDTH - 2);
      // Every item reaches the right end of the day
      expect(Math.round(getRightEdge(box))).toBeGreaterThanOrEqual(dayRight);
    }

    // The ones behind still show their left edge, where the pointer reaches
    const reachable = await Promise.all(
      itemList.map((item) => isTopmostAt(item, 2, 10))
    );

    expect(reachable).toEqual(itemList.map(() => true));
  });

  test("should bring an overlapped video to the front", async ({ page }) => {
    const { items } = await openWednesdayAt21(page);

    // Hovering an item brings it to the front, expands it to the right,
    // keeping its left edge and the place of its icon, and shows the whole
    // title
    const item = items.nth(1);
    const icon = item.locator('[data-testid^="talent-"]');

    expect(await isTopmostAtCenter(item)).toBeFalsy();

    const itemBefore = await item.boundingBox();
    const iconBefore = await icon.boundingBox();

    await item.hover({ position: { x: 2, y: 10 } });

    const itemAfter = await item.boundingBox();
    const iconAfter = await icon.boundingBox();

    expect(itemAfter?.x).toBe(itemBefore?.x);
    expect(itemAfter?.y).toBe(itemBefore?.y);
    expect(iconAfter).toEqual(iconBefore);
    expect(itemAfter?.width ?? 0).toBeGreaterThan(itemBefore?.width ?? 0);
    expect(await isTopmostAtCenter(item)).toBeTruthy();

    // The shadow is on the item itself, so the parts match
    const placement = item.locator("xpath=..");

    const placementBox = await placement.boundingBox();

    expect(placementBox?.height).toBeCloseTo((itemAfter?.height ?? 0) + 2, 0);

    // So does focusing it with the keyboard
    await page.mouse.move(0, 0);

    const first = items.first();
    const firstBefore = await first.boundingBox();

    expect(await isTopmostAtCenter(first)).toBeFalsy();

    await first.focus();

    const firstAfter = await first.boundingBox();

    expect(firstAfter?.width ?? 0).toBeGreaterThan(firstBefore?.width ?? 0);
    expect(await isTopmostAtCenter(first)).toBeTruthy();
  });

  for (const width of [1024, 1280]) {
    test(`should expand a video on Saturday to the left inside the week (${width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width });
      await page.goto("/schedule");
      await expect(getItems(page).first()).toBeVisible();

      // Weeks end on Saturday, so there is no room on the right of the day
      const saturday = getDays(page).nth(6);
      const item = saturday.locator('[data-start="21:00"]');

      await expect(item).toHaveCount(1);
      await scrollToMiddle(item);

      const dayBox = await saturday.boundingBox();
      const before = await item.boundingBox();

      await item.hover();

      const after = await item.boundingBox();

      // As wide as when there is room on the right (14rem, less the gap on the
      // right of the item), keeping the right edge inside the week
      expect(after?.width ?? 0).toBeGreaterThanOrEqual(14 * 16 - 2);
      expect(after?.width ?? 0).toBeGreaterThan(before?.width ?? 0);
      expect(after?.x ?? 0).toBeLessThan(before?.x ?? 0);
      expect(Math.round(getRightEdge(after))).toBeLessThanOrEqual(
        Math.round(getRightEdge(dayBox))
      );
      // The pointer is still on the item, so it stays expanded
      await expect(item.getByTestId("schedule-item-tags")).toBeVisible();
      expect(await isTopmostAtCenter(item)).toBeTruthy();
      await expectNoHorizontalScroll(page);
    });
  }

  for (const width of [1024, 1280]) {
    test(`should keep the crowded videos readable and reachable (${width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width });
      await page.goto("/schedule");
      await expect(getItems(page).first()).toBeVisible();

      // 8 streams start on Thursday of the current week from 20:00 every 5
      // minutes, and 1 more at 21:00
      const thursday = getDays(page).nth(4);
      const starts = [
        ...Array.from(
          { length: 8 },
          (_, index) => `20:${(index * 5).toString().padStart(2, "0")}`
        ),
        "21:00",
      ];
      const items = await Promise.all(
        starts.map(async (start) => {
          const item = thursday.locator(`[data-start="${start}"]`);

          await expect(item).toHaveCount(1);

          return item;
        })
      );
      const [first] = items;

      if (!first) {
        throw new Error("No item");
      }

      await scrollToMiddle(first);

      const boxes = await Promise.all(items.map((item) => item.boundingBox()));
      const lefts = boxes.slice(0, 8).map((box) => box?.x ?? -1);

      // The ones from 20:00 are shifted to the right in turn
      expect(lefts).toEqual(lefts.toSorted((a, b) => a - b));
      expect(new Set(lefts.map(Math.round)).size).toBe(8);

      // Wide enough for the icon and the start time, and not to stack the
      // letters of the title one by one
      for (const box of boxes) {
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_ITEM_WIDTH - 2);
      }

      // The pointer reaches every item at the top of its left edge
      const reachable = await Promise.all(
        items.map((item) => isTopmostAt(item, 2, 2))
      );

      expect(reachable).toEqual(items.map(() => true));

      // The one that starts last is in front of the ones before it
      expect(await isTopmostAtCenter(items[8] ?? first)).toBeTruthy();

      // Even the one at the back comes to the front when hovered
      expect(await isTopmostAtCenter(first)).toBeFalsy();

      await first.hover({ position: { x: 2, y: 2 } });

      await expect(first.getByTestId("schedule-item-tags")).toBeVisible();
      expect(await isTopmostAtCenter(first)).toBeTruthy();
    });
  }

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
