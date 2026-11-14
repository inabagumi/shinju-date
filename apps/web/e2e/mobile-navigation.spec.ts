import { expect, type Page, test } from '@playwright/test'

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3000'

function getHeader(page: Page) {
  return page.locator('body > nav').first()
}

function getInlineNavigation(page: Page) {
  return getHeader(page).locator(':scope > ul')
}

async function getMobileMenu(page: Page) {
  const menuButton = getHeader(page).getByRole('button', { name: 'メニュー' })
  const menuId = await menuButton.getAttribute('aria-controls')

  if (!menuId) {
    throw new Error('Menu button does not control any element')
  }

  return {
    menu: page.locator(`[id="${menuId}"]`),
    menuButton,
  }
}

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { height: 844, width: 390 } })

  test('should open the menu and navigate to the videos page', async ({
    page,
  }) => {
    await page.goto(BASE_URL)

    const { menu, menuButton } = await getMobileMenu(page)

    // The inline desktop links are hidden on mobile
    await expect(getInlineNavigation(page)).toBeHidden()

    await expect(menuButton).toBeVisible()
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    await expect(menu).toBeHidden()

    await menuButton.click()

    await expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    await expect(menu).toBeVisible()
    await expect(
      menu.getByRole('link', { name: 'SHINJU DATEとは' }),
    ).toBeVisible()

    await menu.getByRole('link', { name: '動画一覧' }).click()

    await expect(page).toHaveURL(/\/videos$/)
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    await expect(menu).toBeHidden()
  })

  test('should support keyboard operation', async ({ page }) => {
    await page.goto(BASE_URL)

    const { menu, menuButton } = await getMobileMenu(page)

    await menuButton.focus()
    await page.keyboard.press('Enter')

    await expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    await expect(menu).toBeVisible()

    // Focus moves into the menu with Tab
    await page.keyboard.press('Tab')
    await expect(
      menu.getByRole('link', { name: 'SHINJU DATEとは' }),
    ).toBeFocused()

    // Escape closes the menu and returns focus to the toggle button
    await page.keyboard.press('Escape')

    await expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    await expect(menu).toBeHidden()
    await expect(menuButton).toBeFocused()
  })

  test('should close the menu when clicking outside of it', async ({
    page,
  }) => {
    await page.goto(BASE_URL)

    const { menu, menuButton } = await getMobileMenu(page)

    await menuButton.click()
    await expect(menu).toBeVisible()

    // Click on an empty area of the page outside of the header
    await page.mouse.click(2, 800)

    await expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    await expect(menu).toBeHidden()
  })

  test('should mark the current page with aria-current', async ({ page }) => {
    await page.goto(`${BASE_URL}/about`)

    const { menu, menuButton } = await getMobileMenu(page)

    await menuButton.click()

    await expect(
      menu.getByRole('link', { name: 'SHINJU DATEとは' }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(
      menu.getByRole('link', { name: '動画一覧' }),
    ).not.toHaveAttribute('aria-current')
  })
})

test.describe('Desktop Navigation', () => {
  test.use({ viewport: { height: 800, width: 1280 } })

  test('should keep the inline navigation and hide the menu button', async ({
    page,
  }) => {
    await page.goto(BASE_URL)

    await expect(
      getHeader(page).getByRole('button', { name: 'メニュー' }),
    ).toBeHidden()

    const videosLink = getInlineNavigation(page).getByRole('link', {
      name: '動画一覧',
    })
    await expect(videosLink).toBeVisible()

    await videosLink.click()

    await expect(page).toHaveURL(/\/videos$/)
    await expect(videosLink).toHaveAttribute('aria-current', 'page')
  })
})
