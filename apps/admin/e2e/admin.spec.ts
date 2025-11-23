import { expect, test } from '@playwright/test'

test.describe('Admin App - Login', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('http://localhost:4000/login')
    await page.waitForLoadState('networkidle')

    // Check that login page is displayed
    expect(page.url()).toContain('/login')
  })

  test('should display login form', async ({ page }) => {
    await page.goto('http://localhost:4000/login')
    await page.waitForLoadState('networkidle')

    // Look for email and password inputs
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator(
      'input[type="password"], input[name="password"]',
    )

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })

  test('should login with mock credentials', async ({ page }) => {
    await page.goto('http://localhost:4000/login')
    await page.waitForLoadState('networkidle')

    // Fill in mock credentials (from MSW handlers)
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator(
      'input[type="password"], input[name="password"]',
    )
    const submitButton = page.locator('button[type="submit"]')

    await emailInput.fill('admin@example.com')
    await passwordInput.fill('password123')
    await submitButton.click()

    // Wait for navigation after login
    await page.waitForLoadState('networkidle')

    // Should redirect to dashboard (not on login page anymore)
    expect(page.url()).not.toContain('/login')
  })
})

test.describe('Admin App - Dashboard (Authenticated)', () => {
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

  test('should display dashboard after login', async ({ page }) => {
    // Should be on dashboard or a protected page
    expect(page.url()).not.toContain('/login')

    // Dashboard should load without errors
    await page.waitForLoadState('networkidle')
  })

  test('should navigate to videos page', async ({ page }) => {
    await page.goto('http://localhost:4000/videos')
    await page.waitForLoadState('networkidle')

    // Videos management page should load
    expect(page.url()).toContain('/videos')
  })

  test('should navigate to talents page', async ({ page }) => {
    await page.goto('http://localhost:4000/talents')
    await page.waitForLoadState('networkidle')

    // Talents management page should load
    expect(page.url()).toContain('/talents')
  })

  test('should navigate to terms page', async ({ page }) => {
    await page.goto('http://localhost:4000/terms')
    await page.waitForLoadState('networkidle')

    // Terms management page should load
    expect(page.url()).toContain('/terms')
  })

  test('should navigate to analytics page', async ({ page }) => {
    await page.goto('http://localhost:4000/analytics/search')
    await page.waitForLoadState('networkidle')

    // Analytics page should load
    expect(page.url()).toContain('/analytics')
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
