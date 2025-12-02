import { expect, test } from '@playwright/test'

test.describe('Search Modal - Opening and Closing', () => {
  test('should open search modal when clicking search button', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Click search button
    const searchButton = page.getByRole('link', { name: '検索' })
    await searchButton.click()

    // Wait for modal to appear
    await page.waitForTimeout(500)

    // Verify modal is visible
    const searchInput = page.locator('input[name="q"]')
    await expect(searchInput).toBeVisible()
  })

  test('should close search modal when pressing ESC key', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Open search modal
    const searchButton = page.getByRole('link', { name: '検索' })
    await searchButton.click()
    await page.waitForTimeout(500)

    // Verify modal is open
    const searchInput = page.locator('input[name="q"]')
    await expect(searchInput).toBeVisible()

    // Press ESC key
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Verify modal is closed and we're back at homepage
    await expect(searchInput).not.toBeVisible()
    expect(page.url()).toBe('http://localhost:3000/')
  })

  test('should close search modal when clicking outside (overlay)', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Open search modal
    const searchButton = page.getByRole('link', { name: '検索' })
    await searchButton.click()
    await page.waitForTimeout(500)

    // Verify modal is open
    const searchInput = page.locator('input[name="q"]')
    await expect(searchInput).toBeVisible()

    // Click on overlay (backdrop)
    const overlay = page.locator('[data-radix-dialog-overlay]')
    await overlay.click({ position: { x: 10, y: 10 } })
    await page.waitForTimeout(500)

    // Verify modal is closed and we're back at homepage
    await expect(searchInput).not.toBeVisible()
    expect(page.url()).toBe('http://localhost:3000/')
  })

  test('should open search modal with Cmd/Ctrl+K shortcut', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Press Cmd/Ctrl+K
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+KeyK`)
    await page.waitForTimeout(500)

    // Verify modal is visible
    const searchInput = page.locator('input[name="q"]')
    await expect(searchInput).toBeVisible()
  })
})

test.describe('Search Modal - Direct Navigation', () => {
  test('should handle direct navigation to /search', async ({ page }) => {
    await page.goto('http://localhost:3000/search')
    await page.waitForLoadState('networkidle')

    // Verify modal is visible
    const searchInput = page.locator('input[name="q"]')
    await expect(searchInput).toBeVisible()

    // Close modal with ESC
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Should navigate to homepage
    expect(page.url()).toBe('http://localhost:3000/')
  })

  test('should handle direct navigation to /search with query parameter', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/search?q=test')
    await page.waitForLoadState('networkidle')

    // Verify modal is visible with query populated
    const searchInput = page.locator('input[name="q"]')
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toHaveValue('test')
  })
})

test.describe('Search Modal - Search Functionality', () => {
  test('should perform search and navigate to results', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Open search modal
    const searchButton = page.getByRole('link', { name: '検索' })
    await searchButton.click()
    await page.waitForTimeout(500)

    // Type search query
    const searchInput = page.locator('input[name="q"]')
    await searchInput.fill('test query')
    await page.waitForTimeout(300)

    // Press Enter to submit
    await searchInput.press('Enter')
    await page.waitForTimeout(500)

    // Should navigate to videos page with search query
    expect(page.url()).toContain('/videos/test%20query')
  })

  test('should update search query in real-time', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Open search modal
    const searchButton = page.getByRole('link', { name: '検索' })
    await searchButton.click()
    await page.waitForTimeout(500)

    // Type search query
    const searchInput = page.locator('input[name="q"]')
    await searchInput.fill('test')
    await page.waitForTimeout(300)

    // Verify input value
    await expect(searchInput).toHaveValue('test')

    // Update search query
    await searchInput.fill('updated')
    await page.waitForTimeout(300)

    // Verify updated value
    await expect(searchInput).toHaveValue('updated')
  })

  test('should handle empty search submission', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Open search modal
    const searchButton = page.getByRole('link', { name: '検索' })
    await searchButton.click()
    await page.waitForTimeout(500)

    // Press Enter without typing anything
    const searchInput = page.locator('input[name="q"]')
    await searchInput.press('Enter')
    await page.waitForTimeout(500)

    // Should navigate to videos page without query
    expect(page.url()).toContain('/videos')
    expect(page.url()).not.toContain('%')
  })
})

test.describe('Search Modal - Suggestion Links', () => {
  test('should close modal when clicking a suggestion link', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/search?q=test')
    await page.waitForLoadState('networkidle')

    // Verify modal is open
    const searchInput = page.locator('input[name="q"]')
    await expect(searchInput).toBeVisible()

    // Wait for suggestions to load (if any)
    await page.waitForTimeout(1000)

    // Look for suggestion links
    const suggestionLinks = page.locator('[data-suggestion-link]')
    const count = await suggestionLinks.count()

    if (count > 0) {
      // Click first suggestion
      await suggestionLinks.first().click()
      await page.waitForTimeout(500)

      // Modal should be closed
      await expect(searchInput).not.toBeVisible()

      // Should navigate to videos page
      expect(page.url()).toContain('/videos/')
    }
  })

  test('should support keyboard navigation in suggestions', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/search?q=test')
    await page.waitForLoadState('networkidle')

    // Focus on search input
    const searchInput = page.locator('input[name="q"]')
    await searchInput.focus()

    // Wait for suggestions
    await page.waitForTimeout(1000)

    // Look for suggestion links
    const suggestionLinks = page.locator('[data-suggestion-link]')
    const count = await suggestionLinks.count()

    if (count > 0) {
      // Press ArrowDown to focus first suggestion
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(200)

      // First suggestion should be focused
      const firstSuggestion = suggestionLinks.first()
      await expect(firstSuggestion).toBeFocused()

      // Press ArrowUp to go back to input
      await page.keyboard.press('ArrowUp')
      await page.waitForTimeout(200)

      // Input should be focused again
      await expect(searchInput).toBeFocused()
    }
  })
})

test.describe('Search Modal - Stability Tests', () => {
  test('should handle rapid opening and closing', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    const searchButton = page.getByRole('link', { name: '検索' })

    // Rapidly open and close modal 3 times
    for (let i = 0; i < 3; i++) {
      // Open
      await searchButton.click()
      await page.waitForTimeout(300)

      // Close with ESC
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    // Should end up at homepage
    expect(page.url()).toBe('http://localhost:3000/')

    // Modal should be closed
    const searchInput = page.locator('input[name="q"]')
    await expect(searchInput).not.toBeVisible()
  })

  test('should maintain state across multiple searches', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // First search
    await page.getByRole('link', { name: '検索' }).click()
    await page.waitForTimeout(300)

    let searchInput = page.locator('input[name="q"]')
    await searchInput.fill('first search')
    await searchInput.press('Enter')
    await page.waitForTimeout(500)

    // Should be on videos page
    expect(page.url()).toContain('/videos/first%20search')

    // Second search
    await page.getByRole('link', { name: '検索' }).click()
    await page.waitForTimeout(300)

    searchInput = page.locator('input[name="q"]')
    await searchInput.fill('second search')
    await searchInput.press('Enter')
    await page.waitForTimeout(500)

    // Should be on videos page with new query
    expect(page.url()).toContain('/videos/second%20search')
  })

  test('should handle browser back button after closing modal', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Open modal
    await page.getByRole('link', { name: '検索' }).click()
    await page.waitForTimeout(500)

    // Close modal with ESC
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Should be at homepage
    expect(page.url()).toBe('http://localhost:3000/')

    // Browser back button should work normally (though there might not be history)
    // This test ensures no errors occur
    await page.goBack()
    await page.waitForTimeout(500)

    // Should still be functional
    const searchInput = page.locator('input[name="q"]')
    await expect(searchInput).not.toBeVisible()
  })
})
