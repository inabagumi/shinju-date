import { expect, type Page, test } from "@playwright/test";

// Provided by the MSW mock data (packages/msw-handlers). The first talent has
// a YouTube channel and a Twitch user with icons and finished streams within
// 90 days, mostly on Saturday at 21:00, the second has only a YouTube channel
// without an icon, and the third has no channels or videos.
const TALENT = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "朝霧ミオ",
};
const TALENT_WITHOUT_ICON = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "凪沢ユラ",
};
const TALENT_WITHOUT_VIDEOS = {
  id: "00000000-0000-4000-8000-000000000007",
  name: "動画のないタレント",
};
const RETIRED_TALENT_ID = "00000000-0000-4000-8000-000000000005";
const DELETED_TALENT_ID = "00000000-0000-4000-8000-000000000006";
const MISSING_TALENT_ID = "00000000-0000-4000-8000-0000000000ff";

function getHeader(page: Page) {
  return page.getByRole("main").locator("header");
}

function getVideoCards(page: Page) {
  // Video cards are external links that contain the video title heading
  return page.locator('main a[target="_blank"]:has(h3)');
}

test.describe("Talent page", () => {
  test("should show the icon, the name and the links of a talent", async ({
    page,
  }) => {
    await page.goto(`/talents/${TALENT.id}`);

    await expect(page).toHaveTitle(`${TALENT.name} - SHINJU DATE`);

    const header = getHeader(page);

    await expect(
      header.getByRole("heading", { level: 1, name: TALENT.name })
    ).toBeVisible();
    await expect(header.getByTestId("talent-icon")).toBeVisible();
    await expect(
      header
        .getByRole("navigation", { name: "パンくずリスト" })
        .getByText(TALENT.name)
    ).toBeVisible();

    const youtubeLink = header.getByRole("link", {
      name: "YouTube チャンネル",
    });

    await expect(youtubeLink).toHaveAttribute(
      "href",
      /^https:\/\/www\.youtube\.com\/channel\/UC/
    );
    await expect(youtubeLink).toHaveAttribute("target", "_blank");
    await expect(youtubeLink).toHaveAttribute("rel", "noopener noreferrer");

    const twitchLink = header.getByRole("link", { name: "Twitch チャンネル" });

    await expect(twitchLink).toHaveAttribute(
      "href",
      /^https:\/\/www\.twitch\.tv\/.+/
    );
    await expect(twitchLink).toHaveAttribute("target", "_blank");
    await expect(twitchLink).toHaveAttribute("rel", "noopener noreferrer");

    const calendarLink = header.getByRole("link", { name: "カレンダーに登録" });

    await expect(calendarLink).toHaveAttribute(
      "href",
      `/talents/${TALENT.id}.ics`
    );
    await expect(calendarLink).not.toHaveAttribute("target");
  });

  test("should point to the calendar as an alternate", async ({
    page,
    request,
  }) => {
    await page.goto(`/talents/${TALENT.id}`);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`^https?://[^/]+/talents/${TALENT.id}$`)
    );

    const alternate = page.locator(
      'link[rel="alternate"][type="text/calendar"]'
    );

    await expect(alternate).toHaveAttribute(
      "href",
      new RegExp(`^https?://[^/]+/talents/${TALENT.id}\\.ics$`)
    );

    const response = await request.get(
      (await alternate.getAttribute("href")) ?? ""
    );

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe(
      "text/calendar; charset=UTF-8"
    );
  });

  test("should show only the videos of the talent by date", async ({
    page,
  }) => {
    await page.goto(`/talents/${TALENT.id}`);

    const cards = getVideoCards(page);

    await expect(cards.first()).toBeVisible();
    await expect(page.getByTestId("date-section").first()).toBeVisible();

    for (const creator of await page
      .getByRole("main")
      .getByTestId("video-creator")
      .allTextContents()) {
      expect(creator).toBe(TALENT.name);
    }
  });

  test("should stay on the talent page when switching the kind", async ({
    page,
  }) => {
    await page.goto(`/talents/${TALENT.id}`);

    const kindNav = page.getByRole("navigation", { name: "種別" });

    await expect(kindNav.getByRole("link", { name: "すべて" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    await kindNav.getByRole("link", { name: "ショート" }).click();

    await expect(page).toHaveURL(`/talents/${TALENT.id}?kind=short`);
    await expect(
      kindNav.getByRole("link", { name: "ショート" })
    ).toHaveAttribute("aria-current", "page");
    await expect(getVideoCards(page).first()).toBeVisible();

    const cards = await getVideoCards(page).all();

    for (const card of cards) {
      await expect(card.getByText("ショート", { exact: true })).toBeVisible();
    }

    await kindNav.getByRole("link", { name: "すべて" }).click();

    await expect(page).toHaveURL(`/talents/${TALENT.id}`);
  });

  test("should show the tendency of the streams of a talent", async ({
    page,
  }) => {
    await page.goto(`/talents/${TALENT.id}`);

    const section = page.getByRole("region", { name: "配信の傾向" });

    await expect(
      section.getByRole("heading", { level: 2, name: "配信の傾向" })
    ).toBeVisible();
    await expect(
      section.getByText(
        /^直近90日の配信は\d+回。いちばん多いのは土曜日、時間帯は21時台です。$/
      )
    ).toBeVisible();

    // On wide screens it is always open, without the line to fold it
    await expect(section.locator("summary")).toBeHidden();

    const table = section.getByRole("table", {
      name: "曜日と時間帯ごとの配信回数",
    });

    await expect(table).toBeVisible();
    await expect(table.getByRole("row")).toHaveCount(8);
    await expect(
      table.getByRole("rowheader", { name: "土曜日" })
    ).toBeVisible();

    // On wide screens the section is beside the heading, so the kinds of
    // videos come right below both of them
    const headingBox = await getHeader(page).boundingBox();
    const sectionBox = await section.boundingBox();
    const kindNavBox = await page
      .getByRole("navigation", { name: "種別" })
      .boundingBox();

    if (!headingBox || !sectionBox || !kindNavBox) {
      throw new Error("The heading, the section or the kinds are not shown");
    }

    expect(sectionBox.x).toBeGreaterThanOrEqual(
      headingBox.x + headingBox.width
    );
    expect(sectionBox.y).toBeLessThan(headingBox.y + headingBox.height);
    expect(kindNavBox.y).toBeGreaterThanOrEqual(
      sectionBox.y + sectionBox.height
    );
  });

  test("should fold the tendency of the streams in a narrow screen", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 812, width: 375 });
    await page.goto(`/talents/${TALENT.id}`);

    const section = page.getByRole("region", { name: "配信の傾向" });
    const table = section.getByRole("table", {
      name: "曜日と時間帯ごとの配信回数",
    });
    const toggle = section.locator("summary");

    // Folded into a line with the busiest day and hour, below the heading
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText("土曜日・21時台が多い");
    await expect(table).toBeHidden();

    const headingBox = await getHeader(page).boundingBox();
    const sectionBox = await section.boundingBox();

    expect(sectionBox?.y ?? 0).toBeGreaterThanOrEqual(
      (headingBox?.y ?? 0) + (headingBox?.height ?? 0)
    );

    await toggle.click();

    await expect(table).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );

    expect(hasHorizontalScroll).toBe(false);
  });

  test("should show the default icon for a talent without icons", async ({
    page,
  }) => {
    await page.goto(`/talents/${TALENT_WITHOUT_ICON.id}`);

    const header = getHeader(page);

    await expect(
      header.getByRole("heading", { level: 1, name: TALENT_WITHOUT_ICON.name })
    ).toBeVisible();
    await expect(header.getByTestId("talent-default-icon")).toBeVisible();
    await expect(header.getByRole("link", { name: /Twitch/ })).toHaveCount(0);
  });

  test("should show the empty state for a talent without videos", async ({
    page,
  }) => {
    await page.goto(`/talents/${TALENT_WITHOUT_VIDEOS.id}`);

    await expect(
      getHeader(page).getByRole("heading", {
        level: 1,
        name: TALENT_WITHOUT_VIDEOS.name,
      })
    ).toBeVisible();
    await expect(
      getHeader(page).getByTestId("talent-default-icon")
    ).toBeVisible();
    await expect(page.getByText("動画は見つかりませんでした。")).toBeVisible();
    await expect(getVideoCards(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "配信の傾向" })).toHaveCount(
      0
    );
  });

  for (const [description, id] of [
    ["a talent that does not exist", MISSING_TALENT_ID],
    ["an ID that is not a UUID", "not-a-uuid"],
    ["a retired talent", RETIRED_TALENT_ID],
    ["a deleted talent", DELETED_TALENT_ID],
  ] as const) {
    test(`should show the not-found page for ${description}`, async ({
      page,
    }) => {
      await page.goto(`/talents/${id}`);

      await expect(
        page.getByRole("heading", { level: 1, name: "ページが見つかりません" })
      ).toBeVisible();
      // Cache Components may have started a 200 response by then, so the page
      // is kept out of search engines instead.
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
        "content",
        /noindex/
      );
    });
  }
});

/** The width and height in the IHDR chunk of a PNG */
function getPNGSize(body: Buffer) {
  return { height: body.readUInt32BE(20), width: body.readUInt32BE(16) };
}

test.describe("Open Graph image of the talent page", () => {
  for (const [description, talent] of [
    ["a talent", TALENT],
    // No theme color, no icon and no channels
    ["a talent without a theme color or an icon", TALENT_WITHOUT_VIDEOS],
  ] as const) {
    test(`should point to a 1200x630 PNG for ${description}`, async ({
      page,
      request,
    }) => {
      await page.goto(`/talents/${talent.id}`);

      const ogImage = page.locator('meta[property="og:image"]');

      await expect(ogImage).toHaveAttribute(
        "content",
        new RegExp(`/talents/${talent.id}/opengraph-image`)
      );
      await expect(
        page.locator('meta[property="og:image:width"]')
      ).toHaveAttribute("content", "1200");
      await expect(
        page.locator('meta[property="og:image:height"]')
      ).toHaveAttribute("content", "630");
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image"
      );

      const response = await request.get(
        (await ogImage.getAttribute("content")) ?? ""
      );

      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
      expect(response.headers()["cache-control"]).not.toContain("immutable");
      expect(getPNGSize(await response.body())).toEqual({
        height: 630,
        width: 1200,
      });
    });
  }

  for (const [description, id] of [
    ["a talent that does not exist", MISSING_TALENT_ID],
    ["an ID that is not a UUID", "not-a-uuid"],
    ["a retired talent", RETIRED_TALENT_ID],
    ["a deleted talent", DELETED_TALENT_ID],
  ] as const) {
    test(`should not be found for ${description}`, async ({ request }) => {
      const response = await request.get(`/talents/${id}/opengraph-image`);

      expect(response.status()).toBe(404);
    });
  }
});

test.describe("Videos page after adding the talent page", () => {
  test("should keep the kind filter on the videos page", async ({ page }) => {
    await page.goto("/videos");

    const kindNav = page.getByRole("navigation", { name: "種別" });

    await kindNav.getByRole("link", { name: "ショート" }).click();

    await expect(page).toHaveURL("/videos?kind=short");
    await expect(
      kindNav.getByRole("link", { name: "ショート" })
    ).toHaveAttribute("aria-current", "page");
  });

  test("should keep the kind filter on the search results", async ({
    page,
  }) => {
    const query = "ゲーム";

    await page.goto(`/videos/${encodeURIComponent(query)}`);

    const kindNav = page.getByRole("navigation", { name: "種別" });

    await kindNav.getByRole("link", { name: "動画" }).click();

    await expect(page).toHaveURL(
      `/videos/${encodeURIComponent(query)}?kind=standard`
    );
  });
});
