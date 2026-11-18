import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Keyboard modifier for Cmd/Ctrl+K shortcut
const KEYBOARD_MODIFIER = process.platform === "darwin" ? "Meta" : "Control";

// `歌配信` is a synonym of `歌枠` in the mock terms (packages/msw-handlers),
// so typing `歌配` always suggests `歌枠`
const SUGGESTION_QUERY = "歌配";
const SUGGESTED_TERM = "歌枠";

// The first visit to a page of the search results can take a while on the
// development server, which compiles the page on demand
const NAVIGATION_TIMEOUT = 15_000;

function getSearchDialog(page: Page) {
  return page.getByRole("dialog", { name: "検索" });
}

function getSearchInput(page: Page) {
  return getSearchDialog(page).getByRole("searchbox");
}

function getSuggestionLink(page: Page, name: string) {
  return getSearchDialog(page).getByRole("link", { exact: true, name });
}

async function openSearchModal(page: Page) {
  await page.getByRole("button", { name: "検索" }).click();

  const searchInput = getSearchInput(page);
  await expect(searchInput).toBeVisible();

  return searchInput;
}

test.describe("Search Modal - Opening and Closing", () => {
  test("should open search modal when clicking search button", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await openSearchModal(page);
  });

  test("should open modal with functional (non-disabled) text input", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);

    // CRITICAL: Verify the input is NOT disabled
    await expect(searchInput).toBeEnabled();

    // Verify the input is editable
    await expect(searchInput).toBeEditable();

    // Verify we can actually type in it
    await searchInput.fill("test");
    await expect(searchInput).toHaveValue("test");

    // Verify "Loading..." text is not visible (Suspense resolved)
    await expect(page.getByText("Loading...")).toBeHidden();
  });

  test("should close search modal when pressing ESC key", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);

    await page.keyboard.press("Escape");

    await expect(searchInput).toBeHidden();
  });

  test("should close search modal when clicking outside (overlay)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);
    const viewportSize = page.viewportSize();

    expect(viewportSize).not.toBeNull();

    // The dialog starts listening to clicks outside of it just after it
    // opens, so click the top-right corner (outside the dialog) again until
    // the dialog closes
    await expect(async () => {
      await page.mouse.click((viewportSize?.width ?? 0) - 10, 10);
      await expect(searchInput).toBeHidden({ timeout: 1000 });
    }).toPass();
  });

  test("should open search modal with Cmd/Ctrl+K shortcut", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press(`${KEYBOARD_MODIFIER}+KeyK`);

    await expect(getSearchInput(page)).toBeVisible();
  });
});

test.describe("Search Modal - Direct Navigation", () => {
  test("should handle direct navigation to /search", async ({ page }) => {
    // proxy.ts redirects /search to /videos
    // page.goto will follow the redirect automatically
    await page.goto("/search");

    await expect(page).toHaveURL("/videos");
  });

  test("should handle direct navigation to /search with query parameter", async ({
    page,
  }) => {
    // proxy.ts redirects /search?q=test to /videos/test
    await page.goto("/search?q=test");

    await expect(page).toHaveURL("/videos/test", {
      timeout: NAVIGATION_TIMEOUT,
    });
  });

  test("should redirect multiple queries from /search and /videos to the same URL", async ({
    page,
  }) => {
    const expectedURL = `/videos/${encodeURIComponent("a b")}`;

    await page.goto("/search?q=a&q=b");
    await expect(page).toHaveURL(expectedURL, { timeout: NAVIGATION_TIMEOUT });

    await page.goto("/videos?q=a&q=b");
    await expect(page).toHaveURL(expectedURL, { timeout: NAVIGATION_TIMEOUT });
  });
});

test.describe("Search Modal - Search Functionality", () => {
  test("should perform search and navigate to results", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);

    await searchInput.fill("test query");
    await expect(searchInput).toHaveValue("test query");

    await searchInput.press("Enter");

    await expect(page).toHaveURL("/videos/test%20query", {
      timeout: NAVIGATION_TIMEOUT,
    });
  });

  test("should update search query in real-time", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);

    await searchInput.fill("test");
    await expect(searchInput).toHaveValue("test");

    await searchInput.fill("updated");
    await expect(searchInput).toHaveValue("updated");
  });

  test("should handle empty search submission", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);

    // Press Enter without typing anything
    await searchInput.press("Enter");

    // Modal should remain open (no navigation)
    await expect(searchInput).toBeVisible();
    await expect(page).toHaveURL("/");
  });
});

test.describe("Search Modal - Suggestion Links", () => {
  test("should suggest a term when the query matches one of its synonyms", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);

    await searchInput.fill(SUGGESTION_QUERY);

    await expect(getSuggestionLink(page, SUGGESTED_TERM)).toHaveAttribute(
      "href",
      `/videos/${encodeURIComponent(SUGGESTED_TERM)}`
    );
  });

  test("should close modal when clicking a suggestion link", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);

    await searchInput.fill(SUGGESTION_QUERY);
    await getSuggestionLink(page, SUGGESTED_TERM).click();

    await expect(page).toHaveURL(
      `/videos/${encodeURIComponent(SUGGESTED_TERM)}`,
      { timeout: NAVIGATION_TIMEOUT }
    );
    await expect(searchInput).toBeHidden();
  });

  test("should support keyboard navigation in suggestions", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);

    await searchInput.fill(SUGGESTION_QUERY);

    const suggestionLink = getSuggestionLink(page, SUGGESTED_TERM);
    await expect(suggestionLink).toBeVisible();

    // ArrowDown moves the focus to the first suggestion
    await page.keyboard.press("ArrowDown");
    await expect(suggestionLink).toBeFocused();

    // ArrowUp moves the focus back to the input
    await page.keyboard.press("ArrowUp");
    await expect(searchInput).toBeFocused();
  });
});

test.describe("Search Modal - Stability Tests", () => {
  test("should handle rapid opening and closing", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = getSearchInput(page);

    // Rapidly open and close modal 3 times
    for (let i = 0; i < 3; i++) {
      await openSearchModal(page);

      await page.keyboard.press("Escape");
      await expect(searchInput).toBeHidden();
    }
  });

  test("should maintain state across multiple searches", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // First search
    let searchInput = await openSearchModal(page);

    await searchInput.fill("first search");
    await searchInput.press("Enter");

    await expect(page).toHaveURL("/videos/first%20search", {
      timeout: NAVIGATION_TIMEOUT,
    });
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "『first search』の検索結果",
      })
    ).toBeVisible();

    // Second search
    searchInput = await openSearchModal(page);

    await searchInput.fill("second search");
    await searchInput.press("Enter");

    await expect(page).toHaveURL("/videos/second%20search", {
      timeout: NAVIGATION_TIMEOUT,
    });
  });

  test("should handle browser back button after closing modal", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);

    await page.keyboard.press("Escape");
    await expect(searchInput).toBeHidden();

    // Browser back button should work normally (though there might not be history)
    // This test ensures no errors occur
    await page.goBack();

    // Should still be functional
    await expect(searchInput).toBeHidden();
  });
});

test.describe("Search Modal - Talent", () => {
  function getChipList(page: Page) {
    return getSearchDialog(page).getByRole("list", {
      name: "選んでいるタレント",
    });
  }

  function getTalentOption(page: Page, name: string) {
    return page
      .getByRole("region", { name: "タレント" })
      .getByRole("button", { name });
  }

  test("should search a keyword within the selected talent", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);

    await searchInput.fill("ミオ");
    await getTalentOption(page, "朝霧ミオ").click();

    await expect(getChipList(page).getByText("朝霧ミオ")).toBeVisible();
    await expect(searchInput).toHaveValue("");
    await expect(searchInput).toBeFocused();

    await searchInput.fill("歌枠");
    await searchInput.press("Enter");

    await expect(page).toHaveURL(
      new RegExp(
        `/videos/${encodeURIComponent("歌枠")}\\?talent=[0-9a-f-]{36}$`
      ),
      { timeout: NAVIGATION_TIMEOUT }
    );
  });

  test("should open the video list of the talent and start with its chip", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);

    await searchInput.fill("ユラ");
    await getTalentOption(page, "凪沢ユラ").click();
    await searchInput.press("Enter");

    await expect(page).toHaveURL(/\/videos\?talent=[0-9a-f-]{36}$/, {
      timeout: NAVIGATION_TIMEOUT,
    });
    await expect(
      page
        .getByRole("list", { name: "選んでいるタレント" })
        .getByText("凪沢ユラ")
    ).toBeVisible();

    // 絞り込んだ動画一覧で開き直すと、そのタレントのチップが入っている
    await openSearchModal(page);
    await expect(getChipList(page).getByText("凪沢ユラ")).toBeVisible();
  });

  test("should carry the chip over to the keyword suggestions", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);

    await searchInput.fill("ミオ");
    await getTalentOption(page, "朝霧ミオ").click();

    await searchInput.fill(SUGGESTION_QUERY);

    await expect(getSuggestionLink(page, SUGGESTED_TERM)).toHaveAttribute(
      "href",
      new RegExp(
        `^/videos/${encodeURIComponent(SUGGESTED_TERM)}\\?talent=[0-9a-f-]{36}$`
      )
    );
  });

  test("should select and remove talents only with the keyboard", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = await openSearchModal(page);

    // 候補を選ぶ
    await searchInput.pressSequentially("ミオ");
    await expect(getTalentOption(page, "朝霧ミオ")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(getTalentOption(page, "朝霧ミオ")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(getChipList(page).getByText("朝霧ミオ")).toBeVisible();
    await expect(searchInput).toBeFocused();

    await searchInput.pressSequentially("ユラ");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(getChipList(page).getByRole("listitem")).toHaveCount(2);

    // 入力が空のときの Backspace で最後のチップを外す
    await page.keyboard.press("Backspace");
    await expect(getChipList(page).getByRole("listitem")).toHaveCount(1);
    await expect(getChipList(page).getByText("朝霧ミオ")).toBeVisible();

    // 「外す」ボタンで外す
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: "朝霧ミオを外す" })
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(getChipList(page)).toHaveCount(0);
    await expect(searchInput).toBeFocused();

    // チップがないときの遷移先は変わらない
    await searchInput.pressSequentially("test");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL("/videos/test", {
      timeout: NAVIGATION_TIMEOUT,
    });
  });
});
