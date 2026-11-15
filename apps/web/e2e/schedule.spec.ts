import { expect, type Page, test } from '@playwright/test'

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3000'

// Seeded by the MSW mock data (packages/msw-handlers): a stream on air now,
// 2 streams on each day of the current week (one of them at 21:00 in Japan)
// and 1 in each of the previous and the next weeks
const LIVE_VIDEO_TITLE = '【スケジュール】ただいま配信中'

const WEEK_PATH_PATTERN = /^\/schedule\/(\d{4}-\d{2}-\d{2})$/

/** `YYYY-MM-DD` that is `days` days after `date` */
function addDays(date: string, days: number): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10)
}

function getMain(page: Page) {
  return page.getByRole('main')
}

function getWeekNavigation(page: Page) {
  return page.getByRole('navigation', { name: '週の移動' })
}

function getDays(page: Page) {
  return getMain(page).getByTestId('schedule-day')
}

function getItems(page: Page) {
  return getMain(page).getByTestId('schedule-item')
}

function getWeekLink(page: Page, name: string) {
  return getWeekNavigation(page).getByRole('link', { exact: true, name })
}

async function getLinkPath(page: Page, name: string): Promise<string> {
  const href = await getWeekLink(page, name).getAttribute('href')

  if (!href) {
    throw new Error(`The link "${name}" has no href`)
  }

  return href
}

/** The Sunday (`YYYY-MM-DD`) of the current week */
async function getCurrentWeekStart(page: Page): Promise<string> {
  await page.goto(`${BASE_URL}/schedule`)

  const previousPath = await getLinkPath(page, '前の週')
  const [, previousWeekStart = ''] = previousPath.match(WEEK_PATH_PATTERN) ?? []

  return addDays(previousWeekStart, 7)
}

async function expectNotFound(page: Page) {
  await expect(
    page.getByRole('heading', { level: 1, name: 'ページが見つかりません' }),
  ).toBeVisible()
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
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/schedule$/,
    )
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)

    const liveItem = getItems(page).filter({ hasText: LIVE_VIDEO_TITLE })

    await expect(liveItem).toBeVisible()
    await expect(
      liveItem.getByText('配信中', { exact: true }).filter({ visible: true }),
    ).toBeVisible()
    await expect(liveItem).toHaveAttribute(
      'href',
      /^https:\/\/www\.youtube\.com\/watch\?v=/,
    )
    await expect(liveItem).toHaveAttribute('ping', '/api/ping')
    await expect(liveItem).toHaveAttribute('target', '_blank')
    await expect(liveItem).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('should place the videos on the time axis of 24 hours', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1280 })
    await page.goto(`${BASE_URL}/schedule`)
    await expect(getItems(page).first()).toBeVisible()

    // Every day of the current week has a stream at 21:00, at the same height
    const tops = await Promise.all(
      (await getDays(page).all()).map(async (day) =>
        Math.round(
          (await day.locator('[data-start="21:00"]').first().boundingBox())
            ?.y ?? -1,
        ),
      ),
    )

    expect(new Set(tops).size).toBe(1)

    // An hour is 64px, so 21:00 is 21 hours below 00:00 (the top of the day)
    const sunday = getDays(page).first()
    const body = await sunday.locator('ul').boundingBox()
    const itemAt21 = await sunday.locator('[data-start="21:00"]').boundingBox()

    expect(Math.round((itemAt21?.y ?? 0) - (body?.y ?? 0))).toBe(21 * 64)
  })

  test('should draw a live stream for an hour', async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 })
    await page.goto(`${BASE_URL}/schedule`)

    const live = getMain(page)
      .locator('li')
      .filter({
        has: page.getByTestId('schedule-item').filter({
          hasText: LIVE_VIDEO_TITLE,
        }),
      })

    // 64px for an hour
    expect(Math.round((await live.boundingBox())?.height ?? 0)).toBe(64)
  })

  test('should draw an ended stream as long as it was', async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 })

    // Every stream of the previous week has ended, and lasted 1.5 hours
    const currentWeekStart = await getCurrentWeekStart(page)

    await page.goto(`${BASE_URL}/schedule/${addDays(currentWeekStart, -7)}`)

    const item = getMain(page)
      .locator('li')
      .filter({
        has: page.getByTestId('schedule-item').filter({ hasText: /#15$/ }),
      })

    expect(Math.round((await item.boundingBox())?.height ?? 0)).toBe(96)
  })

  test('should put the videos that overlap side by side', async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 })
    await page.goto(`${BASE_URL}/schedule`)
    await expect(getItems(page).first()).toBeVisible()

    // 4 streams start at 21:00 on Wednesday of the current week
    // Weeks start on Sunday
    const wednesday = getDays(page).nth(3)
    const items = wednesday.locator('[data-start="21:00"]')

    await expect(items).toHaveCount(4)

    const boxes = await Promise.all(
      (await items.all()).map((item) => item.boundingBox()),
    )

    expect(new Set(boxes.map((box) => Math.round(box?.y ?? -1))).size).toBe(1)
    expect(new Set(boxes.map((box) => Math.round(box?.x ?? -1))).size).toBe(4)

    // Only the icons are shown, and the link is named with everything
    for (const item of await items.all()) {
      await expect(item).toHaveAttribute('data-compact', 'true')
      await expect(item).toHaveAttribute('aria-label', /^21:00 /)
    }

    // Hovering an item expands it to the width of the day with everything
    const last = items.last()
    const title = last.getByText('〖FORKROAD〗右か左かすきなほうをえらんでね', {
      exact: false,
    })
    const dayBox = await wednesday.boundingBox()

    await expect(title).toBeHidden()
    await last.hover()
    await expect(title).toBeVisible()
    await expect(last.getByText('21:00', { exact: true })).toBeVisible()
    expect(
      Math.round((await last.boundingBox())?.width ?? 0),
    ).toBeGreaterThanOrEqual(Math.round((dayBox?.width ?? 0) - 4))

    // So does focusing it with the keyboard
    await page.mouse.move(0, 0)
    await expect(title).toBeHidden()

    const first = items.first()

    await first.focus()
    await expect(first.getByText('21:00', { exact: true })).toBeVisible()
  })

  test('should keep every item inside the column of its day', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1280 })
    await page.goto(`${BASE_URL}/schedule`)
    await expect(getItems(page).first()).toBeVisible()

    const overflows = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="schedule-day"]')].flatMap(
        (day) => {
          const { left, right } = day.getBoundingClientRect()

          return [...day.querySelectorAll('[data-testid="schedule-item"]')]
            .map((item) => item.getBoundingClientRect())
            .filter((box) => box.left < left - 1 || box.right > right + 1)
        },
      ),
    )

    expect(overflows).toHaveLength(0)
  })

  test('should keep the dates on the screen while scrolling', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 600, width: 1280 })
    await page.goto(`${BASE_URL}/schedule`)
    await expect(getItems(page).first()).toBeVisible()

    await getMain(page)
      .locator('[data-start="21:00"]')
      .first()
      .scrollIntoViewIfNeeded()

    const heading = getDays(page).first().getByRole('heading', { level: 2 })

    await expect(heading).toBeInViewport()

    // Right below the header of the site (56px)
    expect(Math.round((await heading.boundingBox())?.y ?? 0)).toBeLessThan(120)
  })

  test('should move between the weeks with the Sunday URLs', async ({
    page,
  }) => {
    const currentWeekStart = await getCurrentWeekStart(page)
    const previousWeekStart = addDays(currentWeekStart, -7)
    const nextWeekStart = addDays(currentWeekStart, 7)

    expect(await getLinkPath(page, '次の週')).toBe(`/schedule/${nextWeekStart}`)
    expect(await getLinkPath(page, '今週')).toBe('/schedule')

    await getWeekLink(page, '前の週').click()

    await expect(page).toHaveURL(`${BASE_URL}/schedule/${previousWeekStart}`)
    await expect(getMain(page).locator('[aria-current="date"]')).toHaveCount(0)
    // The stream seeded in the previous week
    await expect(getItems(page)).not.toHaveCount(0)

    await getWeekLink(page, '次の週').click()

    await expect(page).toHaveURL(`${BASE_URL}/schedule/${currentWeekStart}`)
    await expect(getMain(page).locator('[aria-current="date"]')).toHaveCount(1)

    await getWeekLink(page, '今週').click()

    await expect(page).toHaveURL(`${BASE_URL}/schedule`)
  })

  test('should show the week of a date that is not a Sunday', async ({
    page,
  }) => {
    const currentWeekStart = await getCurrentWeekStart(page)
    const wednesday = addDays(currentWeekStart, 3)

    await page.goto(`${BASE_URL}/schedule/${wednesday}`)

    await expect(getDays(page)).toHaveCount(7)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/schedule/${currentWeekStart}$`),
    )
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    )
    await expect(page).toHaveTitle(
      /^\d{4}年\d+月\d+日〜.+の配信スケジュール - SHINJU DATE$/,
    )
    await expect(getDays(page).first()).toHaveAttribute(
      'id',
      `day-${currentWeekStart}`,
    )
  })

  test('should show up to 4 weeks after the current week', async ({ page }) => {
    const currentWeekStart = await getCurrentWeekStart(page)
    const lastWeekStart = addDays(currentWeekStart, 28)

    await page.goto(`${BASE_URL}/schedule/${lastWeekStart}`)

    await expect(getDays(page)).toHaveCount(7)
    // No link to the week that cannot be shown
    await expect(getWeekLink(page, '前の週')).toBeVisible()
    await expect(getWeekLink(page, '次の週')).toHaveCount(0)

    await page.goto(`${BASE_URL}/schedule/${addDays(lastWeekStart, 7)}`)

    await expectNotFound(page)
  })

  test('should not show the weeks before the oldest video', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/schedule/2000-01-03`)

    await expectNotFound(page)
  })

  for (const value of ['2026-02-30', '2026-W46', 'today']) {
    test(`should show the not-found page for ${value}`, async ({ page }) => {
      await page.goto(`${BASE_URL}/schedule/${value}`)

      await expectNotFound(page)
    })
  }

  test('should put the 7 days side by side on a wide screen', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1280 })
    await page.goto(`${BASE_URL}/schedule`)

    await expect(getDays(page)).toHaveCount(7)
    await expect(page.getByRole('navigation', { name: '曜日' })).toBeHidden()

    const boxes = await Promise.all(
      (await getDays(page).all()).map((day) => day.boundingBox()),
    )

    expect(new Set(boxes.map((box) => Math.round(box?.y ?? -1))).size).toBe(1)
    await expectNoHorizontalScroll(page)
  })

  for (const width of [375, 768]) {
    test(`should stack the days with the band of weekdays (${width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 844, width })
      await page.goto(`${BASE_URL}/schedule`)

      await expect(getDays(page)).toHaveCount(7)

      const boxes = await Promise.all(
        (await getDays(page).all()).map((day) => day.boundingBox()),
      )
      const tops = boxes.map((box) => box?.y ?? -1)

      expect(new Set(boxes.map((box) => Math.round(box?.x ?? -1))).size).toBe(1)
      expect(tops).toEqual(tops.toSorted((a, b) => a - b))
      await expectNoHorizontalScroll(page)

      const band = page.getByRole('navigation', { name: '曜日' })
      const links = band.getByRole('link')

      await expect(links).toHaveCount(7)

      const sundayHref = await links.last().getAttribute('href')

      expect(sundayHref).toMatch(/^#day-\d{4}-\d{2}-\d{2}$/)

      await links.last().click()

      await expect(page).toHaveURL(new RegExp(`${sundayHref}$`))
      await expect(getDays(page).last()).toBeInViewport()
    })
  }

  test('should be linked from the navigation, the footer and the home page', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1280 })
    await page.goto(BASE_URL)

    await expect(
      page
        .getByRole('banner')
        .getByRole('link', { exact: true, name: 'スケジュール' }),
    ).toHaveAttribute('href', '/schedule')
    await expect(
      page
        .getByRole('contentinfo')
        .getByRole('link', { exact: true, name: 'スケジュール' }),
    ).toHaveAttribute('href', '/schedule')

    await page
      .getByRole('region', { name: '配信予定' })
      .getByRole('link', { name: 'スケジュールを見る' })
      .click()

    await expect(page).toHaveURL(`${BASE_URL}/schedule`)
  })
})
