import { expect, type Locator, type Page, test } from '@playwright/test'

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3000'

// Provided by the MSW mock data (packages/msw-handlers)
const ANNOUNCEMENT_MESSAGE = 'メンテナンスのお知らせ'

interface Box {
  height: number
  width: number
  x: number
  y: number
}

function getHeader(page: Page) {
  return page.locator('body > nav').first()
}

function getBanner(page: Page) {
  return page.getByTestId('announcement-banner')
}

function getVideoCards(page: Page) {
  // Video cards are external links that contain the video title heading
  return page.locator('main a[target="_blank"]:has(h3)')
}

async function getBoundingBox(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()

  if (!box) {
    throw new Error('Element is not rendered')
  }

  return box
}

function intersects(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

/**
 * Assert that the announcement banner does not overlap any of the video
 * cards at the current scroll position.
 */
async function expectBannerNotToOverlapVideoCards(page: Page) {
  const bannerBox = await getBoundingBox(getBanner(page))
  const cardBoxes = await getVideoCards(page).evaluateAll((elements) =>
    elements.map((element) => {
      const { height, width, x, y } = element.getBoundingClientRect()

      return { height, width, x, y }
    }),
  )

  expect(cardBoxes.length).toBeGreaterThan(0)

  for (const cardBox of cardBoxes) {
    expect(intersects(bannerBox, cardBox)).toBe(false)
  }
}

async function openVideosPage(page: Page) {
  await page.goto(`${BASE_URL}/videos`)

  await expect(getBanner(page)).toBeVisible()
  await expect(getBanner(page)).toContainText(ANNOUNCEMENT_MESSAGE)
  await expect(getVideoCards(page).first()).toBeVisible()
}

function describeViewport(
  name: string,
  viewport: { height: number; width: number },
) {
  test.describe(name, () => {
    test.use({ viewport })

    test('should be placed below the header without covering the content', async ({
      page,
    }) => {
      await openVideosPage(page)

      const headerBox = await getBoundingBox(getHeader(page))
      const bannerBox = await getBoundingBox(getBanner(page))

      // The banner sits in the page flow directly below the sticky header
      expect(bannerBox.y).toBeGreaterThanOrEqual(
        headerBox.y + headerBox.height - 1,
      )
      expect(bannerBox.width).toBeLessThanOrEqual(viewport.width)

      await expectBannerNotToOverlapVideoCards(page)
    })

    test('should not follow the scroll position or overlap video cards while scrolling', async ({
      page,
    }) => {
      await openVideosPage(page)

      const banner = getBanner(page)
      const initialBox = await getBoundingBox(banner)

      // Scroll through the page step by step. At every position, the banner
      // must not cover any video card.
      const step = Math.floor(viewport.height / 2)
      for (let index = 0; index < 6; index++) {
        await page.mouse.wheel(0, step)
        // Wait for the smooth scroll / layout to settle
        await page.waitForTimeout(100)

        await expectBannerNotToOverlapVideoCards(page)
      }

      // The banner scrolls away with the content instead of sticking to the
      // viewport
      const scrolledBox = await getBoundingBox(banner)
      expect(scrolledBox.y).toBeLessThan(initialBox.y)
      await expect(banner).not.toBeInViewport()
    })

    test('should keep expand, collapse and dismiss behavior', async ({
      page,
    }) => {
      await openVideosPage(page)

      const banner = getBanner(page)
      const messageButton = banner.getByRole('button', {
        name: ANNOUNCEMENT_MESSAGE,
      })
      const closeButton = banner.getByRole('button', {
        name: 'お知らせを閉じる',
      })

      await expect(messageButton).toHaveAttribute('aria-expanded', 'false')

      // Wait for hydration so that the click handlers are attached
      await page.waitForLoadState('networkidle')

      await messageButton.click()
      await expect(messageButton).toHaveAttribute('aria-expanded', 'true')

      await messageButton.click()
      await expect(messageButton).toHaveAttribute('aria-expanded', 'false')

      await closeButton.click()
      await expect(banner).toBeHidden()

      // The dismissed state is persisted in a cookie
      await page.reload()
      await expect(getVideoCards(page).first()).toBeVisible()
      await expect(banner).toBeHidden()
    })
  })
}

test.describe('Announcement Banner', () => {
  describeViewport('Mobile', { height: 844, width: 390 })
  describeViewport('Desktop', { height: 1000, width: 1440 })

  test.describe('Narrow screen', () => {
    test.use({ viewport: { height: 568, width: 320 } })

    test('should keep the message and the close button usable', async ({
      page,
    }) => {
      await openVideosPage(page)

      const banner = getBanner(page)
      const messageButton = banner.getByRole('button', {
        name: ANNOUNCEMENT_MESSAGE,
      })
      const closeButton = banner.getByRole('button', {
        name: 'お知らせを閉じる',
      })

      await expect(messageButton).toBeInViewport()
      await expect(closeButton).toBeInViewport()

      const bannerBox = await getBoundingBox(banner)
      const closeButtonBox = await getBoundingBox(closeButton)

      // Nothing overflows the narrow viewport horizontally
      expect(bannerBox.x + bannerBox.width).toBeLessThanOrEqual(320)
      expect(closeButtonBox.x + closeButtonBox.width).toBeLessThanOrEqual(320)

      await page.waitForLoadState('networkidle')

      await closeButton.click()
      await expect(banner).toBeHidden()
    })
  })
})
