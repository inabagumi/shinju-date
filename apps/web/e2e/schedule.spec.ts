import { expect, type Page, test } from '@playwright/test'

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3000'

// Seeded by the MSW mock data (packages/msw-handlers) a week before the mock
// server starts, so it is always in the previous week
const LAST_WEEK_VIDEO_TITLE = '【定期】先週の歌枠アーカイブ'

const WEEK_PATH_PATTERN = /^\/schedule\/\d{4}-\d{2}-\d{2}$/

function getMain(page: Page) {
  return page.getByRole('main')
}

function getWeekNavigation(page: Page) {
  return page.getByRole('navigation', { name: '週の移動' })
}

function getDays(page: Page) {
  return getMain(page).getByTestId('schedule-day')
}

function getItem(page: Page, title: string) {
  return getMain(page).getByTestId('schedule-item').filter({ hasText: title })
}

async function getLinkPath(page: Page, name: string): Promise<string> {
  const href = await getWeekNavigation(page)
    .getByRole('link', { exact: true, name })
    .getAttribute('href')

  if (!href) {
    throw new Error(`The link "${name}" has no href`)
  }

  return href
}

async function expectNoHorizontalScroll(page: Page) {
  const { clientWidth, scrollWidth } = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
}

test.describe('Schedule page', () => {
  test('should show the 7 days of the current week with today marked', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/schedule`)

    await expect(page).toHaveTitle('配信スケジュール - SHINJU DATE')
    await expect(
      getMain(page).getByRole('heading', {
        level: 1,
        name: '配信スケジュール',
      }),
    ).toBeVisible()
    await expect(getDays(page)).toHaveCount(7)
    await expect(getMain(page).locator('[aria-current="date"]')).toHaveCount(1)
    await expect(getMain(page).getByText('今日', { exact: true })).toBeVisible()
    await expect(getItem(page, LAST_WEEK_VIDEO_TITLE)).toHaveCount(0)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/schedule$/,
    )
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  })

  test('should move between the weeks with the Monday URLs', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/schedule`)

    const previousPath = await getLinkPath(page, '前の週')
    const nextPath = await getLinkPath(page, '次の週')

    expect(previousPath).toMatch(WEEK_PATH_PATTERN)
    expect(nextPath).toMatch(WEEK_PATH_PATTERN)

    await getWeekNavigation(page)
      .getByRole('link', { exact: true, name: '前の週' })
      .click()

    await expect(page).toHaveURL(`${BASE_URL}${previousPath}`)

    const item = getItem(page, LAST_WEEK_VIDEO_TITLE)

    await expect(item).toBeVisible()
    await expect(item).toContainText('終了済み')
    await expect(item).toContainText('白露ネネ')
    // Linked like a video card
    await expect(item).toHaveAttribute(
      'href',
      /^https:\/\/www\.youtube\.com\/watch\?v=/,
    )
    await expect(item).toHaveAttribute('ping', '/api/ping')
    await expect(item).toHaveAttribute('target', '_blank')
    // The talent has a theme color
    await expect(item).toHaveCSS('border-left-color', 'rgb(152, 216, 200)')
    // Today is not in the previous week
    await expect(getMain(page).locator('[aria-current="date"]')).toHaveCount(0)

    // The next week of the previous week is the current week, with its Monday
    const currentPath = await getLinkPath(page, '次の週')

    expect(currentPath).toMatch(WEEK_PATH_PATTERN)

    await getWeekNavigation(page)
      .getByRole('link', { exact: true, name: '次の週' })
      .click()

    await expect(page).toHaveURL(`${BASE_URL}${currentPath}`)
    await expect(getMain(page).locator('[aria-current="date"]')).toHaveCount(1)
    expect(await getLinkPath(page, '前の週')).toBe(previousPath)
    expect(await getLinkPath(page, '次の週')).toBe(nextPath)

    await getWeekNavigation(page)
      .getByRole('link', { exact: true, name: '今週' })
      .click()

    await expect(page).toHaveURL(`${BASE_URL}/schedule`)
    await expect(getItem(page, LAST_WEEK_VIDEO_TITLE)).toHaveCount(0)
  })

  test('should show the week of a date that is not a Monday', async ({
    page,
  }) => {
    // Thursday, 12 November 2026
    await page.goto(`${BASE_URL}/schedule/2026-11-12`)

    await expect(
      getMain(page).getByRole('heading', {
        level: 2,
        name: '2026年11月9日〜15日',
      }),
    ).toBeVisible()
    await expect(page).toHaveTitle(
      '2026年11月9日〜15日の配信スケジュール - SHINJU DATE',
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/schedule\/2026-11-09$/,
    )
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    )
    expect(await getLinkPath(page, '前の週')).toBe('/schedule/2026-11-02')
    expect(await getLinkPath(page, '次の週')).toBe('/schedule/2026-11-16')
    expect(await getLinkPath(page, '今週')).toBe('/schedule')

    const headings = getDays(page).getByRole('heading', { level: 3 })

    await expect(headings).toHaveText([
      /^11\/9（月）/,
      /^11\/10（火）/,
      /^11\/11（水）/,
      /^11\/12（木）/,
      /^11\/13（金）/,
      /^11\/14（土）/,
      /^11\/15（日）/,
    ])
  })

  test('should go to the next year from the last week of a year', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/schedule/2027-01-01`)

    await expect(
      getMain(page).getByRole('heading', {
        level: 2,
        name: '2026年12月28日〜2027年1月3日',
      }),
    ).toBeVisible()
    expect(await getLinkPath(page, '次の週')).toBe('/schedule/2027-01-04')
  })

  for (const value of ['2026-02-30', '2026-W46', 'today']) {
    test(`should show the not-found page for ${value}`, async ({ page }) => {
      await page.goto(`${BASE_URL}/schedule/${value}`)

      await expect(
        page.getByRole('heading', { level: 1, name: 'ページが見つかりません' }),
      ).toBeVisible()
    })
  }

  test('should put the 7 days side by side on a wide screen', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1280 })
    await page.goto(`${BASE_URL}/schedule`)

    await expect(getDays(page)).toHaveCount(7)

    const boxes = await Promise.all(
      (await getDays(page).all()).map((day) => day.boundingBox()),
    )
    const tops = new Set(boxes.map((box) => Math.round(box?.y ?? -1)))

    expect(tops.size).toBe(1)
    await expectNoHorizontalScroll(page)
  })

  // Below 1024px, a column of the 7 days would be too narrow for the names
  for (const width of [390, 768]) {
    test(`should stack the days on a narrow screen (${width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 844, width })
      await page.goto(`${BASE_URL}/schedule`)

      await expect(getDays(page)).toHaveCount(7)

      const boxes = await Promise.all(
        (await getDays(page).all()).map((day) => day.boundingBox()),
      )
      const lefts = new Set(boxes.map((box) => Math.round(box?.x ?? -1)))
      const tops = boxes.map((box) => box?.y ?? -1)

      expect(lefts.size).toBe(1)
      expect(tops).toEqual(tops.toSorted((a, b) => a - b))
      await expectNoHorizontalScroll(page)
    })
  }

  test('should be linked from the navigation and the home page', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1280 })
    await page.goto(BASE_URL)

    await expect(
      page
        .getByRole('banner')
        .getByRole('link', { exact: true, name: '配信スケジュール' }),
    ).toHaveAttribute('href', '/schedule')

    await page
      .getByRole('region', { name: '配信予定' })
      .getByRole('link', { name: 'スケジュールを見る' })
      .click()

    await expect(page).toHaveURL(`${BASE_URL}/schedule`)
  })
})
