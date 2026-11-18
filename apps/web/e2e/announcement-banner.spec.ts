import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

// Provided by the MSW mock data (packages/msw-handlers)
const ANNOUNCEMENT_MESSAGE = "メンテナンスのお知らせ";
const ANNOUNCEMENT_LINK_TEXT = "メンテナンス情報";
const ANNOUNCEMENT_LINK_URL = "https://example.com/maintenance";
const ANNOUNCEMENT_STRUCK_TEXT = "11月20日";

interface Box {
  height: number;
  width: number;
  x: number;
  y: number;
}

const getBanner = (page: Page) => page.getByTestId("announcement-banner");

const getMinimizedBanner = (page: Page) =>
  page.getByTestId("announcement-banner-minimized");

const getVideoCards = (page: Page) =>
  // Video cards are external links that contain the video title heading
  page.locator('main a[target="_blank"]:has(h3)');

const getBoundingBox = async (locator: Locator): Promise<Box> => {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error("Element is not rendered");
  }

  return box;
};

const intersects = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

/**
 * Assert that the content next to (left of) the given sticky element is
 * clickable: pick the video card that shares the largest vertical range
 * with the element and check that a click in that card is not intercepted
 * by the banner wrapper.
 */
const expectContentBesideToBeClickable = async (page: Page, box: Box) => {
  const cardBoxes = await getVideoCardBoxes(page);

  let best: { overlap: number; x: number; y: number } | null = null;
  for (const cardBox of cardBoxes) {
    if (cardBox.x >= box.x - 40) {
      continue;
    }

    const top = Math.max(cardBox.y, box.y);
    const bottom = Math.min(cardBox.y + cardBox.height, box.y + box.height);
    const overlap = bottom - top;

    if (overlap >= 8 && (!best || overlap > best.overlap)) {
      best = {
        overlap,
        x: Math.min(cardBox.x + cardBox.width / 2, box.x - 20),
        y: (top + bottom) / 2,
      };
    }
  }

  expect(best).not.toBeNull();

  const hitsVideoCard = await page.evaluate(
    ([pointX, pointY]) => {
      const element = document.elementFromPoint(pointX, pointY);

      return (
        element instanceof Element &&
        element.closest('main a[target="_blank"]:has(h3)') !== null
      );
    },
    [best?.x ?? 0, best?.y ?? 0] as const
  );

  expect(hitsVideoCard).toBe(true);
};

/**
 * Scroll down step by step until a video card spans the whole vertical
 * range of the given sticky element, so that the element is clearly
 * covering that card.
 */
const scrollUntilCardSpans = async (page: Page, locator: Locator) => {
  await expect
    .poll(
      async () => {
        // Scroll synchronously, so that the boxes below are measured after
        // the scroll without waiting for it
        await page.evaluate(() =>
          window.scrollBy({ behavior: "instant", top: 40 })
        );

        const box = await getBoundingBox(locator);
        const cardBoxes = await getVideoCardBoxes(page);

        return cardBoxes.some(
          (cardBox) =>
            intersects(box, cardBox) &&
            cardBox.y <= box.y &&
            box.y + box.height <= cardBox.y + cardBox.height
        );
      },
      { timeout: 15_000 }
    )
    .toBe(true);
};

const getVideoCardBoxes = async (page: Page): Promise<Box[]> =>
  getVideoCards(page).evaluateAll((elements) =>
    elements.map((element) => {
      const { height, width, x, y } = element.getBoundingClientRect();

      return { height, width, x, y };
    })
  );

/**
 * Scroll to the end of the document and wait until the document height
 * stops changing: the height is compared with the one at the previous check,
 * and `expect.poll` waits between the checks.
 */
const scrollToEnd = async (page: Page) => {
  let previousHeight: number | null = null;

  await expect
    .poll(
      async () => {
        const height = await page.evaluate(() => {
          window.scrollTo({
            behavior: "instant",
            top: document.documentElement.scrollHeight,
          });

          return document.documentElement.scrollHeight;
        });
        const isStable = height === previousHeight;

        previousHeight = height;

        return isStable;
      },
      { intervals: [300], timeout: 15_000 }
    )
    .toBe(true);
};

const openPage = async (page: Page, path: string) => {
  await page.goto(path);

  await expect(getBanner(page)).toBeVisible();
  await expect(getBanner(page)).toContainText(ANNOUNCEMENT_MESSAGE);
  await expect(getVideoCards(page).first()).toBeVisible();
  // Wait for hydration so that the click handlers are attached
  await page.waitForLoadState("networkidle");
};

const describeViewport = (
  name: string,
  viewport: { height: number; width: number }
) => {
  test.describe(name, () => {
    test.use({ viewport });

    test("should not cover any video card once the page is scrolled to the end", async ({
      page,
    }) => {
      await openPage(page, "/");

      await scrollToEnd(page);

      const banner = getBanner(page);
      await expect(banner).toBeInViewport({ ratio: 1 });

      const bannerBox = await getBoundingBox(banner);
      const cardBoxes = await getVideoCardBoxes(page);

      expect(cardBoxes.length).toBeGreaterThan(0);
      for (const cardBox of cardBoxes) {
        expect(intersects(bannerBox, cardBox)).toBe(false);
      }
    });

    test("should be minimizable so that it stops covering the video list", async ({
      page,
    }) => {
      await openPage(page, "/videos");

      const banner = getBanner(page);
      const minimizeButton = banner.getByRole("button", {
        name: "お知らせを縮小",
      });

      // Scroll into the list so that the sticky banner covers a video card
      await page.mouse.wheel(0, Math.floor(viewport.height / 2));
      await scrollUntilCardSpans(page, banner);

      const bannerBox = await getBoundingBox(banner);

      // The transparent area next to the banner must not block the cards
      // (only checked when there is content next to the banner)
      if (bannerBox.x > 40) {
        await expectContentBesideToBeClickable(page, bannerBox);
      }

      await minimizeButton.click();

      const minimized = getMinimizedBanner(page);
      await expect(banner).toBeHidden();
      await expect(minimized).toBeVisible();
      await expect(minimized).toBeFocused();
      await expect(minimized).toHaveAttribute("aria-expanded", "false");

      // The minimized pill is much smaller than the banner and keeps the
      // area the banner used to cover visible
      const minimizedBox = await getBoundingBox(minimized);
      expect(minimizedBox.width).toBeLessThan(bannerBox.width / 2);
      expect(minimizedBox.height).toBeLessThan(bannerBox.height);
      expect(minimizedBox.x + minimizedBox.width).toBeLessThanOrEqual(
        bannerBox.x + bannerBox.width + 1
      );

      // The content next to the pill and the area the banner used to cover
      // are clickable again
      await expectContentBesideToBeClickable(page, minimizedBox);
      await expectContentBesideToBeClickable(page, {
        ...bannerBox,
        x: bannerBox.x + bannerBox.width,
      });

      // The announcement can be restored from the pill
      await minimized.click();
      await expect(minimized).toBeHidden();
      await expect(banner).toBeVisible();
      await expect(minimizeButton).toBeFocused();
    });

    test("should keep expand, collapse and dismiss behavior", async ({
      page,
    }) => {
      await openPage(page, "/videos");

      const banner = getBanner(page);
      const messageButton = banner.getByRole("button", {
        name: ANNOUNCEMENT_MESSAGE,
      });
      const closeButton = banner.getByRole("button", {
        name: "お知らせを閉じる",
      });

      await expect(messageButton).toHaveAttribute("aria-expanded", "false");

      await messageButton.click();
      await expect(messageButton).toHaveAttribute("aria-expanded", "true");

      await messageButton.click();
      await expect(messageButton).toHaveAttribute("aria-expanded", "false");

      await closeButton.click();
      await expect(banner).toBeHidden();
      await expect(getMinimizedBanner(page)).toBeHidden();

      // The dismissed state is persisted in a cookie
      await page.reload();
      await expect(getVideoCards(page).first()).toBeVisible();
      await expect(banner).toBeHidden();
    });
  });
};

test.describe("Announcement Banner", () => {
  test("should render the Markdown message", async ({ page }) => {
    await openPage(page, "/videos");

    const banner = getBanner(page);
    const messageButton = banner.getByRole("button", {
      name: ANNOUNCEMENT_MESSAGE,
    });

    await messageButton.click();
    await expect(messageButton).toHaveAttribute("aria-expanded", "true");

    // Links open in a new tab without passing the referrer
    const link = banner.getByRole("link", { name: ANNOUNCEMENT_LINK_TEXT });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", ANNOUNCEMENT_LINK_URL);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "nofollow noopener noreferrer");

    // GFM syntax (strikethrough) is rendered, and no Markdown source is shown
    await expect(banner.locator("del")).toHaveText(ANNOUNCEMENT_STRUCK_TEXT);
    await expect(banner).not.toContainText("~~");
    await expect(banner).not.toContainText("](");
  });

  test("should refetch the announcement every minute", async ({ page }) => {
    // Control the timers of the page, so that the refetch can be triggered
    // without waiting for a minute
    await page.clock.install();
    await openPage(page, "/videos");

    // The announcement is fetched again with a Server Action. The other
    // Server Actions of the page (the trackers) are called while it loads,
    // and `openPage` waits for them, so the next one is the refetch. The
    // response is streamed and its body may stay open on the development
    // server, so only its status is checked.
    const refetchRequest = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        request.headers()["next-action"] !== undefined
    );

    await page.clock.fastForward("01:00");

    const response = await (await refetchRequest).response();

    expect(response?.ok()).toBe(true);
    await expect(getBanner(page)).toContainText(ANNOUNCEMENT_MESSAGE);
  });

  describeViewport("Mobile", { height: 844, width: 390 });
  describeViewport("Desktop", { height: 1000, width: 1440 });

  test.describe("Narrow screen", () => {
    test.use({ viewport: { height: 568, width: 320 } });

    test("should keep the message and the controls usable", async ({
      page,
    }) => {
      await openPage(page, "/videos");

      const banner = getBanner(page);
      const messageButton = banner.getByRole("button", {
        name: ANNOUNCEMENT_MESSAGE,
      });
      const minimizeButton = banner.getByRole("button", {
        name: "お知らせを縮小",
      });
      const closeButton = banner.getByRole("button", {
        name: "お知らせを閉じる",
      });

      await expect(messageButton).toBeInViewport({ ratio: 1 });
      await expect(minimizeButton).toBeInViewport({ ratio: 1 });
      await expect(closeButton).toBeInViewport({ ratio: 1 });

      // Nothing overflows the narrow viewport
      await expect(banner).toBeInViewport({ ratio: 1 });

      await closeButton.click();
      await expect(banner).toBeHidden();
    });
  });
});
