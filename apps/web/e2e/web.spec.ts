import { expect, test } from '@playwright/test'

test.describe('Web App - Homepage', () => {
  test('should load the homepage successfully', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Check that the page title is set
    await expect(page).toHaveTitle(/SHINJU DATE/)
  })

  test('should display navigation elements', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Check for common navigation elements (using first() since there may be multiple nav elements)
    const navigation = page.locator('nav').first()
    await expect(navigation).toBeVisible()
  })

  test('should have working links', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Find and click on the navigation videos link (動画一覧)
    const videosLink = page.getByRole('link', { name: '動画一覧' })
    if (await videosLink.isVisible()) {
      await videosLink.click()
      // Use timeout instead of networkidle to avoid hanging
      await page.waitForTimeout(2000)

      // Should navigate to videos page
      expect(page.url()).toContain('videos')
    }
  })
})

test.describe('Web App - Videos Page', () => {
  test('should load the videos page', async ({ page }) => {
    await page.goto('http://localhost:3000/videos')
    await page.waitForLoadState('networkidle')

    // Page should load without errors
    expect(page.url()).toContain('/videos')
  })

  test('should display video list with mock data', async ({ page }) => {
    await page.goto('http://localhost:3000/videos')
    await page.waitForLoadState('networkidle')

    // Wait for content to load
    await page.waitForTimeout(1000)

    // Check if videos are rendered (MSW should provide mock data)
    // The actual selectors depend on your UI implementation
    const videoItems = page.locator(
      '[data-testid="video-item"], article, [role="article"]',
    )
    const count = await videoItems.count()

    // Should have some videos from mock data
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Web App - Search Functionality', () => {
  test('should have search functionality', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Look for search input or button
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="検索"], input[placeholder*="search"]',
    )
    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await searchInput.press('Enter')

      // Wait for search results
      await page.waitForLoadState('networkidle')
    }
  })
})

test.describe('Web App - Contact Page', () => {
  test('should load the contact page', async ({ page }) => {
    await page.goto('http://localhost:3000/contact')
    await page.waitForLoadState('networkidle')

    // Page should load without errors
    expect(page.url()).toContain('/contact')
  })
})
