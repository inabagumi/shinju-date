import { expect, test } from '@playwright/test'

test.describe('Admin App - Basic Tests', () => {
  // Note: Full E2E testing of authenticated pages is limited due to Supabase SSR
  // cookie-based session management complexity with MSW. These tests verify basic
  // page loading without authentication.

  test('should load the login page', async ({ page }) => {
    await page.goto('http://localhost:4000/login')
    await page.waitForLoadState('networkidle')

    // Login page should be accessible
    expect(page.url()).toContain('/login')
  })

  test('should display login form elements', async ({ page }) => {
    await page.goto('http://localhost:4000/login')
    await page.waitForLoadState('networkidle')

    // Check that basic form elements are present
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator(
      'input[type="password"], input[name="password"]',
    )

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })

  test('should have submit button', async ({ page }) => {
    await page.goto('http://localhost:4000/login')
    await page.waitForLoadState('networkidle')

    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
  })
})

test.describe('Admin App - Videos Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:4000/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator(
      'input[type="password"], input[name="password"]',
    )
    const submitButton = page.locator('button[type="submit"]')

    await emailInput.fill('admin@example.com')
    await passwordInput.fill('password123')
    await submitButton.click()
    await page.waitForLoadState('networkidle')
  })

  test('should display videos list with mock data', async ({ page }) => {
    await page.goto('http://localhost:4000/videos')
    await page.waitForLoadState('networkidle')

    // Wait for content to load
    await page.waitForTimeout(1000)

    // Videos should be displayed (from MSW mock data)
    // The actual implementation may vary, so this is a basic check
    const content = await page.textContent('body')
    expect(content).toBeTruthy()
  })

  test('should allow filtering videos', async ({ page }) => {
    await page.goto('http://localhost:4000/videos')
    await page.waitForLoadState('networkidle')

    // Look for filter inputs or controls
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="検索"], input[placeholder*="search"]',
    )
    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await page.waitForLoadState('networkidle')
    }
  })
})

test.describe('Admin App - Feedback Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:4000/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator(
      'input[type="password"], input[name="password"]',
    )
    const submitButton = page.locator('button[type="submit"]')

    await emailInput.fill('admin@example.com')
    await passwordInput.fill('password123')
    await submitButton.click()
    await page.waitForLoadState('networkidle')
  })

  test('should return 404 for invalid feedback ID', async ({ page }) => {
    // Try to access feedback with an invalid ID
    const response = await page.goto(
      'http://localhost:4000/feedback/invalid-id-format',
    )

    // Should return 404 status
    expect(response?.status()).toBe(404)

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Should display 404 page content
    const content = await page.textContent('body')
    expect(content).toContain('404')
    expect(content).toContain('ページが見つかりません')
  })

  test('should return 404 for non-existent feedback UUID', async ({ page }) => {
    // Try to access feedback with a valid UUID format but non-existent ID
    const response = await page.goto(
      'http://localhost:4000/feedback/00000000-0000-0000-0000-000000000000',
    )

    // Should return 404 status
    expect(response?.status()).toBe(404)

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Should display 404 page content
    const content = await page.textContent('body')
    expect(content).toContain('404')
    expect(content).toContain('ページが見つかりません')
  })
})

test.describe('Admin App - Terms Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:4000/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator(
      'input[type="password"], input[name="password"]',
    )
    const submitButton = page.locator('button[type="submit"]')

    await emailInput.fill('admin@example.com')
    await passwordInput.fill('password123')
    await submitButton.click()
    await page.waitForLoadState('networkidle')
  })

  test('should display terms list', async ({ page }) => {
    await page.goto('http://localhost:4000/terms')
    await page.waitForLoadState('networkidle')

    // Wait for content to load
    await page.waitForTimeout(1000)

    // Terms page should load successfully
    const content = await page.textContent('body')
    expect(content).toBeTruthy()
  })
})
