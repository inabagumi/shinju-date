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
    // Wait for the sign-in redirect so that the session cookie is set
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))
  })

  for (const viewport of [
    { height: 844, name: 'mobile', width: 390 },
    { height: 1000, name: 'desktop', width: 1440 },
  ]) {
    test(`should display videos list with mock data (${viewport.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({
        height: viewport.height,
        width: viewport.width,
      })
      await page.goto('http://localhost:4000/videos')

      await expect(
        page.getByRole('heading', { level: 1, name: '動画管理' }),
      ).toBeVisible()
      // Next.js may keep a hidden copy of streamed content in the DOM, so
      // only match the visible element.
      await expect(
        page.getByText(/全 [\d,]+ 件の動画/).filter({ visible: true }),
      ).toBeVisible()

      const table = page.getByRole('table')
      await expect(
        table.getByRole('columnheader', { name: 'タレント' }),
      ).toBeVisible()

      // Rows rendered from MSW mock data
      const rows = table.locator('tbody tr')
      await expect(rows.first()).toBeVisible()
      await expect(table.getByText('動画がありません。')).toHaveCount(0)
      expect(await rows.count()).toBeGreaterThan(0)

      // The title links to the detail page and the talent relation is resolved
      const firstRow = rows.first()
      await expect(
        firstRow.locator('a[href^="/videos/"]').first(),
      ).toHaveAttribute('href', /^\/videos\/[0-9a-f-]{36}$/)
      const talentCell = firstRow.locator('td').nth(4)
      await expect(talentCell).not.toBeEmpty()
      await expect(talentCell).not.toHaveText('タレント不明')

      await expect(page.getByText('Application error')).toHaveCount(0)
    })
  }

  test('should display a video detail page from the list', async ({ page }) => {
    await page.goto('http://localhost:4000/videos')

    const href = await page
      .locator('tbody tr a[href^="/videos/"]')
      .first()
      .getAttribute('href')
    await page.goto(`http://localhost:4000${href}`)

    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty()
    await expect(page).toHaveTitle(/^(?!undefined).+ - 動画詳細 - /)
    await expect(page.getByText('Temporal error')).toHaveCount(0)
  })

  test('should display not found for a missing video', async ({ page }) => {
    await page.goto(
      'http://localhost:4000/videos/00000000-0000-0000-0000-000000000000',
    )

    await expect(page.getByText('ページが見つかりません')).toBeVisible()
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

test.describe('Admin App - Talents Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4000/login')
    await page.waitForLoadState('networkidle')

    await page
      .locator('input[type="email"], input[name="email"]')
      .fill('admin@example.com')
    await page
      .locator('input[type="password"], input[name="password"]')
      .fill('password123')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))
  })

  test('should display a talent detail page from the list', async ({
    page,
  }) => {
    await page.goto('http://localhost:4000/talents')

    const href = await page
      .locator('a[href^="/talents/"]')
      .evaluateAll((links) =>
        links
          .map((link) => link.getAttribute('href'))
          .find((value) => value && /^\/talents\/[0-9a-f-]{36}$/.test(value)),
      )
    expect(href).toBeTruthy()
    await page.goto(`http://localhost:4000${href}`)

    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty()
    await expect(page).toHaveTitle(/^(?!undefined).+ - タレント詳細 - /)
    await expect(page.getByText('Temporal error')).toHaveCount(0)
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

test.describe('Admin App - Not Found', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4000/login')
    await page.waitForLoadState('networkidle')

    await page
      .locator('input[type="email"], input[name="email"]')
      .fill('admin@example.com')
    await page
      .locator('input[type="password"], input[name="password"]')
      .fill('password123')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))
  })

  test('should display the custom 404 page with the navigation bar for unmatched URLs', async ({
    page,
  }) => {
    const response = await page.goto('http://localhost:4000/nope-nope')

    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole('heading', { level: 2, name: 'ページが見つかりません' }),
    ).toBeVisible()
    await expect(page.getByRole('navigation')).toHaveCount(1)
    await expect(page.getByRole('navigation')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'ダッシュボードに戻る' }),
    ).toBeVisible()
    await expect(page.getByText('This page could not be found.')).toHaveCount(0)
  })
})
