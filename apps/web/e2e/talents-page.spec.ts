import { expect, type Page, test } from '@playwright/test'

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3000'

// Provided by the MSW mock data (packages/msw-handlers): five active talents,
// a retired talent and a deleted talent. The first talent has icons, and the
// talent without videos has no channels, so it has no icon.
const TALENT = {
  id: '00000000-0000-4000-8000-000000000001',
  name: '朝霧ミオ',
}
const TALENT_WITHOUT_ICON_NAME = '動画のないタレント'
const ACTIVE_TALENT_COUNT = 5

// The grid comes right under `<main>`, after the breadcrumbs in the header
function getTalentList(page: Page) {
  return page.getByRole('main').locator(':scope > ul')
}

function getTalentCard(page: Page, name: string) {
  return getTalentList(page).getByRole('link', { exact: true, name })
}

test.describe('Talents page', () => {
  test('should list the active talents with their icons', async ({ page }) => {
    await page.goto(`${BASE_URL}/talents`)

    await expect(page).toHaveTitle('タレント一覧 - SHINJU DATE')

    const header = page.getByRole('main').locator('header')

    await expect(
      header.getByRole('heading', { level: 1, name: 'タレント一覧' }),
    ).toBeVisible()
    await expect(
      header
        .getByRole('navigation', { name: 'パンくずリスト' })
        .getByText('タレント一覧'),
    ).toBeVisible()
    await expect(header.getByText(`${ACTIVE_TALENT_COUNT}人`)).toBeVisible()

    await expect(getTalentList(page).getByRole('listitem')).toHaveCount(
      ACTIVE_TALENT_COUNT,
    )
    await expect(
      getTalentCard(page, TALENT.name).getByTestId('talent-icon'),
    ).toBeVisible()
    await expect(
      getTalentCard(page, TALENT_WITHOUT_ICON_NAME).getByTestId(
        'talent-default-icon',
      ),
    ).toBeVisible()
  })

  test('should not list the retired or deleted talents', async ({ page }) => {
    await page.goto(`${BASE_URL}/talents`)

    await expect(getTalentCard(page, TALENT.name)).toBeVisible()
    await expect(
      getTalentList(page).getByText('引退したタレント'),
    ).not.toBeVisible()
    await expect(
      getTalentList(page).getByText('削除したタレント'),
    ).not.toBeVisible()
  })

  test('should point to the list as the canonical URL', async ({ page }) => {
    await page.goto(`${BASE_URL}/talents`)

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/talents$/,
    )
  })

  for (const { columns, width } of [
    { columns: 3, width: 390 },
    { columns: 4, width: 640 },
    { columns: 5, width: 768 },
    { columns: 6, width: 1024 },
  ]) {
    test(`should show ${columns} columns at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ height: 900, width })
      await page.goto(`${BASE_URL}/talents`)

      const list = getTalentList(page)

      await expect(list.getByRole('listitem')).toHaveCount(ACTIVE_TALENT_COUNT)

      // There are fewer talents than columns, so count the grid tracks
      // instead of the items on a row
      expect(
        await list.evaluate(
          (element) =>
            getComputedStyle(element).gridTemplateColumns.split(' ').length,
        ),
      ).toBe(columns)
    })
  }

  test('should open the page of a talent from the list', async ({ page }) => {
    await page.goto(`${BASE_URL}/talents`)

    await getTalentCard(page, TALENT.name).click()

    await expect(page).toHaveURL(`${BASE_URL}/talents/${TALENT.id}`)
    await expect(
      page.getByRole('heading', { level: 1, name: TALENT.name }),
    ).toBeVisible()

    // The breadcrumbs lead back to the list
    await page
      .getByRole('navigation', { name: 'パンくずリスト' })
      .getByRole('link', { name: 'タレント一覧' })
      .click()

    await expect(page).toHaveURL(`${BASE_URL}/talents`)
  })
})

test.describe('Navigation to the talents page', () => {
  test.use({ viewport: { height: 800, width: 1280 } })

  test('should open the list from the header', async ({ page }) => {
    await page.goto(BASE_URL)

    const link = page
      .getByRole('banner')
      .getByRole('navigation', { name: 'メイン' })
      .first()
      .getByRole('link', { name: 'タレント一覧' })

    await link.click()

    await expect(page).toHaveURL(`${BASE_URL}/talents`)
    await expect(link).toHaveAttribute('aria-current', 'page')
  })

  test('should mark the list as current on the page of a talent', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/talents/${TALENT.id}`)

    await expect(
      page
        .getByRole('banner')
        .getByRole('navigation', { name: 'メイン' })
        .first()
        .getByRole('link', { name: 'タレント一覧' }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(
      page
        .getByRole('navigation', { name: 'フッター' })
        .getByRole('link', { name: 'タレント一覧' }),
    ).toHaveAttribute('aria-current', 'page')
  })

  test('should open the list from the footer', async ({ page }) => {
    await page.goto(`${BASE_URL}/about`)

    await page
      .getByRole('navigation', { name: 'フッター' })
      .getByRole('link', { name: 'タレント一覧' })
      .click()

    await expect(page).toHaveURL(`${BASE_URL}/talents`)
  })
})

test.describe('Navigation to the talents page on mobile', () => {
  test.use({ viewport: { height: 844, width: 390 } })

  test('should open the list from the mobile menu', async ({ page }) => {
    await page.goto(BASE_URL)

    const menuButton = page
      .getByRole('banner')
      .getByRole('button', { name: 'メニュー' })
    const menuId = await menuButton.getAttribute('aria-controls')

    await menuButton.click()

    const menu = page.locator(`[id="${menuId}"]`)
    await expect(menu).toBeVisible()

    // お問い合わせ follows them only when the contact form is enabled
    expect(
      (await menu.getByRole('link').allTextContents()).slice(0, 4),
    ).toEqual([
      'SHINJU DATEとは',
      '配信スケジュール',
      '動画一覧',
      'タレント一覧',
    ])

    await menu.getByRole('link', { name: 'タレント一覧' }).click()

    await expect(page).toHaveURL(`${BASE_URL}/talents`)
  })
})

test.describe('Sitemap', () => {
  test('should include the list and the active talents', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/sitemap.xml`)
    const body = await response.text()

    expect(response.ok()).toBe(true)
    expect(body).toMatch(/<loc>[^<]*\/talents<\/loc>/)
    expect(body).toContain(`/talents/${TALENT.id}</loc>`)
    expect(body).not.toContain('/talents/00000000-0000-4000-8000-000000000005')
    expect(body).not.toContain('/talents/00000000-0000-4000-8000-000000000006')
  })
})
