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

function getBanner(page: Page) {
  return page.getByTestId('announcement-banner')
}

function getMinimizedBanner(page: Page) {
  return page.getByTestId('announcement-banner-minimized')
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
 * Assert that the content next to (left of) the given sticky element is
 * clickable: pick a video card that shares a horizontal band with the
 * element and check that a click in that card is not intercepted by the
 * banner wrapper.
 */
async function expectContentBesideToBeClickable(page: Page, box: Box) {
  const cardBoxes = await getVideoCardBoxes(page)
  const candidateYs = [
    box.y + box.height / 2,
    box.y + 8,
    box.y + box.height - 8,
  ]

  let point: [x: number, y: number] | null = null
  for (const y of candidateYs) {
    const card = cardBoxes.find(
      (cardBox) =>
        cardBox.y < y &&
        y < cardBox.y + cardBox.height &&
        cardBox.x < box.x - 40,
    )

    if (card) {
      point = [Math.min(card.x + card.width / 2, box.x - 20), y]
      break
    }
  }

  expect(point).not.toBeNull()

  const hitsVideoCard = await page.evaluate(
    ([pointX, pointY]) => {
      const element = document.elementFromPoint(pointX, pointY)

      return (
        element instanceof Element &&
        element.closest('main a[target="_blank"]:has(h3)') !== null
      )
    },
    point as [number, number],
  )

  expect(hitsVideoCard).toBe(true)
}

async function getVideoCardBoxes(page: Page): Promise<Box[]> {
  return getVideoCards(page).evaluateAll((elements) =>
    elements.map((element) => {
      const { height, width, x, y } = element.getBoundingClientRect()

      return { height, width, x, y }
    }),
  )
}

/**
 * Scroll to the end of the document and wait until the document height
 * stops changing.
 */
async function scrollToEnd(page: Page) {
  await expect
    .poll(
      async () => {
        const before = await page.evaluate(
          () => document.documentElement.scrollHeight,
        )

        await page.evaluate(() =>
          window.scrollTo(0, document.documentElement.scrollHeight),
        )
        await page.waitForTimeout(300)

        const after = await page.evaluate(
          () => document.documentElement.scrollHeight,
        )

        return before === after
      },
      { timeout: 15_000 },
    )
    .toBe(true)
}

async function openPage(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`)

  await expect(getBanner(page)).toBeVisible()
  await expect(getBanner(page)).toContainText(ANNOUNCEMENT_MESSAGE)
  await expect(getVideoCards(page).first()).toBeVisible()
  // Wait for hydration so that the click handlers are attached
  await page.waitForLoadState('networkidle')
}

function describeViewport(
  name: string,
  viewport: { height: number; width: number },
) {
  test.describe(name, () => {
    test.use({ viewport })

    test('should not cover any video card once the page is scrolled to the end', async ({
      page,
    }) => {
      await openPage(page, '/')

      await scrollToEnd(page)

      const banner = getBanner(page)
      await expect(banner).toBeInViewport({ ratio: 1 })

      const bannerBox = await getBoundingBox(banner)
      const cardBoxes = await getVideoCardBoxes(page)

      expect(cardBoxes.length).toBeGreaterThan(0)
      for (const cardBox of cardBoxes) {
        expect(intersects(bannerBox, cardBox)).toBe(false)
      }
    })

    test('should be minimizable so that it stops covering the video list', async ({
      page,
    }) => {
      await openPage(page, '/videos')

      const banner = getBanner(page)
      const minimizeButton = banner.getByRole('button', {
        name: 'お知らせを縮小',
      })

      // Scroll into the list so that the sticky banner overlaps video cards
      await page.mouse.wheel(0, Math.floor(viewport.height / 2))
      await expect
        .poll(async () => {
          const bannerBox = await getBoundingBox(banner)
          const cardBoxes = await getVideoCardBoxes(page)

          return cardBoxes.some((cardBox) => intersects(bannerBox, cardBox))
        })
        .toBe(true)

      const bannerBox = await getBoundingBox(banner)

      // The transparent area next to the banner must not block the cards
      // (only checked when there is content next to the banner)
      if (bannerBox.x > 40) {
        await expectContentBesideToBeClickable(page, bannerBox)
      }

      await minimizeButton.click()

      const minimized = getMinimizedBanner(page)
      await expect(banner).toBeHidden()
      await expect(minimized).toBeVisible()
      await expect(minimized).toBeFocused()
      await expect(minimized).toHaveAttribute('aria-expanded', 'false')

      // The minimized pill is much smaller than the banner and keeps the
      // area the banner used to cover visible
      const minimizedBox = await getBoundingBox(minimized)
      expect(minimizedBox.width).toBeLessThan(bannerBox.width / 2)
      expect(minimizedBox.height).toBeLessThan(bannerBox.height)
      expect(minimizedBox.x + minimizedBox.width).toBeLessThanOrEqual(
        bannerBox.x + bannerBox.width + 1,
      )

      // The content next to the pill and the area the banner used to cover
      // are clickable again
      await expectContentBesideToBeClickable(page, minimizedBox)
      await expectContentBesideToBeClickable(page, {
        ...bannerBox,
        x: bannerBox.x + bannerBox.width,
      })

      // The announcement can be restored from the pill
      await minimized.click()
      await expect(minimized).toBeHidden()
      await expect(banner).toBeVisible()
      await expect(minimizeButton).toBeFocused()
    })

    test('should keep expand, collapse and dismiss behavior', async ({
      page,
    }) => {
      await openPage(page, '/videos')

      const banner = getBanner(page)
      const messageButton = banner.getByRole('button', {
        name: ANNOUNCEMENT_MESSAGE,
      })
      const closeButton = banner.getByRole('button', {
        name: 'お知らせを閉じる',
      })

      await expect(messageButton).toHaveAttribute('aria-expanded', 'false')

      await messageButton.click()
      await expect(messageButton).toHaveAttribute('aria-expanded', 'true')

      await messageButton.click()
      await expect(messageButton).toHaveAttribute('aria-expanded', 'false')

      await closeButton.click()
      await expect(banner).toBeHidden()
      await expect(getMinimizedBanner(page)).toBeHidden()

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

    test('should keep the message and the controls usable', async ({
      page,
    }) => {
      await openPage(page, '/videos')

      const banner = getBanner(page)
      const messageButton = banner.getByRole('button', {
        name: ANNOUNCEMENT_MESSAGE,
      })
      const minimizeButton = banner.getByRole('button', {
        name: 'お知らせを縮小',
      })
      const closeButton = banner.getByRole('button', {
        name: 'お知らせを閉じる',
      })

      await expect(messageButton).toBeInViewport({ ratio: 1 })
      await expect(minimizeButton).toBeInViewport({ ratio: 1 })
      await expect(closeButton).toBeInViewport({ ratio: 1 })

      // Nothing overflows the narrow viewport horizontally
      const bannerBox = await getBoundingBox(banner)
      expect(bannerBox.x).toBeGreaterThanOrEqual(0)
      expect(bannerBox.x + bannerBox.width).toBeLessThanOrEqual(320)

      await closeButton.click()
      await expect(banner).toBeHidden()
    })
  })
})
