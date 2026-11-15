import { expect, type Page, test } from '@playwright/test'

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3000'

// Provided by the MSW mock data (packages/msw-handlers). The first talent has
// icons and the fourth has only a YouTube channel without an icon.
const TALENT = {
  id: '00000000-0000-4000-8000-000000000001',
  name: '朝霧ミオ',
}
const TALENT_WITHOUT_ICON = {
  id: '00000000-0000-4000-8000-000000000004',
  name: '凪沢ユラ',
}
// The active talents, including one without channels or videos
const ACTIVE_TALENT_COUNT = 5
const HIDDEN_TALENT_NAMES = ['引退したタレント', '削除したタレント']

function getTalentList(page: Page) {
  return page.getByRole('main').getByTestId('talent-list')
}

function getTalentCard(page: Page, name: string) {
  return getTalentList(page).getByRole('link', { exact: true, name })
}

test.describe('Talents page', () => {
  test('should list the active talents with the number of them', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/talents`)

    await expect(page).toHaveTitle('タレント一覧 - SHINJU DATE')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${BASE_URL}/talents`,
    )

    const header = page.getByRole('main').locator('header')

    await expect(
      header.getByRole('heading', { level: 1, name: 'タレント一覧' }),
    ).toBeVisible()
    await expect(header.getByText(`${ACTIVE_TALENT_COUNT}人`)).toBeVisible()
    await expect(getTalentList(page).getByRole('listitem')).toHaveCount(
      ACTIVE_TALENT_COUNT,
    )
    await expect(
      getTalentCard(page, TALENT.name).getByTestId('talent-icon'),
    ).toBeVisible()
    await expect(
      getTalentCard(page, TALENT_WITHOUT_ICON.name).getByTestId(
        'talent-default-icon',
      ),
    ).toBeVisible()

    for (const name of HIDDEN_TALENT_NAMES) {
      await expect(getTalentList(page).getByText(name)).toHaveCount(0)
    }
  })

  for (const [width, columns] of [
    [390, 3],
    [640, 4],
    [768, 5],
    [1024, 6],
  ] as const) {
    test(`should show ${columns} columns at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ height: 900, width })
      await page.goto(`${BASE_URL}/talents`)

      await expect(
        getTalentList(page).getByRole('listitem').first(),
      ).toBeVisible()

      const templateColumns = await getTalentList(page).evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns,
      )

      expect(templateColumns.split(' ')).toHaveLength(columns)
    })
  }

  test('should open the page of a talent from the list and come back', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/talents`)

    await getTalentCard(page, TALENT.name).click()

    await expect(page).toHaveURL(`${BASE_URL}/talents/${TALENT.id}`)
    await expect(
      page.getByRole('heading', { level: 1, name: TALENT.name }),
    ).toBeVisible()

    await page
      .getByRole('navigation', { name: 'パンくずリスト' })
      .getByRole('link', { name: 'タレント一覧' })
      .click()

    await expect(page).toHaveURL(`${BASE_URL}/talents`)
  })

  test('should open the list from the header and mark it as current', async ({
    page,
  }) => {
    await page.goto(BASE_URL)

    const headerLink = page
      .getByRole('banner')
      .getByRole('link', { name: 'タレント一覧' })

    await headerLink.click()

    await expect(page).toHaveURL(`${BASE_URL}/talents`)
    await expect(headerLink).toHaveAttribute('aria-current', 'page')
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'タレント一覧' }),
    ).toHaveAttribute('aria-current', 'page')

    await getTalentCard(page, TALENT.name).click()

    await expect(page).toHaveURL(`${BASE_URL}/talents/${TALENT.id}`)
    await expect(headerLink).toHaveAttribute('aria-current', 'page')
  })

  test('should open the list from the mobile menu', async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto(BASE_URL)

    const menuButton = page
      .getByRole('banner')
      .getByRole('button', { name: 'メニュー' })
    const menuId = await menuButton.getAttribute('aria-controls')
    const menu = page.locator(`[id="${menuId}"]`)

    await menuButton.click()
    await menu.getByRole('link', { name: 'タレント一覧' }).click()

    await expect(page).toHaveURL(`${BASE_URL}/talents`)

    await menuButton.click()

    await expect(
      menu.getByRole('link', { name: 'タレント一覧' }),
    ).toHaveAttribute('aria-current', 'page')
  })

  test('should list the talents in the sitemap', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/sitemap.xml`)
    const body = await response.text()

    expect(response.status()).toBe(200)
    expect(body).toContain(`<loc>${BASE_URL}/talents</loc>`)
    expect(body).toContain(`<loc>${BASE_URL}/talents/${TALENT.id}</loc>`)
    expect(body).not.toContain('00000000-0000-4000-8000-000000000005')
    expect(body).not.toContain('00000000-0000-4000-8000-000000000006')
  })
})
