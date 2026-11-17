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
    await expect(
      page.getByRole('heading', { level: 1, name: 'Admin UI' }),
    ).toBeVisible()
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
      const talentCell = firstRow.locator('td').nth(3)
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

  test('should confirm a lifecycle change from the list in a dialog', async ({
    page,
  }) => {
    await page.goto('http://localhost:4000/talents')

    await page
      .getByRole('button', { name: /^「.+」の操作$/ })
      .first()
      .click()
    await page.getByRole('menuitem', { name: '削除' }).click()

    const dialog = page.getByRole('dialog', { name: 'タレントを削除' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/タレント「.+」を削除しますか？/)

    await dialog.getByRole('button', { name: 'キャンセル' }).click()
    await expect(dialog).toBeHidden()
  })

  test('should confirm a lifecycle change from the detail page in a dialog', async ({
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

    await page.getByRole('button', { exact: true, name: '削除' }).click()

    const dialog = page.getByRole('dialog', { name: 'タレントを削除' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/タレント「.+」を削除しますか？/)

    await dialog.getByRole('button', { name: 'キャンセル' }).click()
    await expect(dialog).toBeHidden()
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
    // Wait for the sign-in redirect so that the session cookie is set
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))
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

  test('should edit the synonyms of a term in the modal', async ({ page }) => {
    await page.goto('http://localhost:4000/terms')

    await page
      .getByRole('row')
      .filter({ hasText: '歌枠' })
      .getByRole('button', { name: '編集' })
      .click()

    const dialog = page.getByRole('dialog', { name: '用語を編集' })
    const termInput = dialog.getByRole('textbox', { name: '用語' })
    const synonymInputs = dialog.getByPlaceholder('類義語を入力')

    // The focus moves to the term input, which does not wait for dnd-kit
    await expect(termInput).toBeFocused()
    await termInput.fill('歌枠（編集中）')

    // The sortable list replaces the placeholder once dnd-kit is loaded
    await expect(
      dialog.getByRole('button', { name: '類義語を追加' }),
    ).toBeEnabled()
    await expect(termInput).toHaveValue('歌枠（編集中）')
    await expect(synonymInputs).toHaveCount(2)

    const synonymValues = () =>
      synonymInputs.evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value),
      )

    expect(await synonymValues()).toEqual(['歌配信', 'カラオケ配信'])

    // Add and remove an input
    await dialog.getByRole('button', { name: '類義語を追加' }).click()
    await synonymInputs.nth(2).fill('歌ってみた')
    expect(await synonymValues()).toEqual([
      '歌配信',
      'カラオケ配信',
      '歌ってみた',
    ])

    // The readings have only one input, so every remove button is a synonym's
    await dialog.getByRole('button', { name: '削除' }).first().click()
    expect(await synonymValues()).toEqual(['カラオケ配信', '歌ってみた'])

    // The first handle belongs to the only reading
    const handles = dialog.getByRole('button', { name: 'ドラッグして並び替え' })
    const synonymHandles = [handles.nth(1), handles.nth(2)] as const

    // Reorder with the keyboard. Playwright presses the keys faster than a
    // person, and dnd-kit may ignore an arrow key pressed right after the drag
    // starts, so drop the row where it is and try again until it moves.
    // (Escape would also close the dialog.)
    await expect(async () => {
      await synonymHandles[0].focus()
      await page.keyboard.press('Space')

      try {
        await expect(
          page.getByText(/^Draggable item .+ was moved over droppable area /),
        ).toBeAttached({ timeout: 1000 })
        await page.keyboard.press('ArrowDown')
        // Drop only after dnd-kit has moved the row over the next one
        await expect(
          page.getByText(
            /^Draggable item (\S+) was moved over droppable area (?!\1\.)/,
          ),
        ).toBeAttached({ timeout: 1000 })
      } catch (error) {
        await page.keyboard.press('Space')
        throw error
      }

      await page.keyboard.press('Space')
    }).toPass()
    await expect.poll(synonymValues).toEqual(['歌ってみた', 'カラオケ配信'])

    // Reorder with the mouse
    const handleBox = await synonymHandles[0].boundingBox()
    const targetBox = await synonymHandles[1].boundingBox()

    if (!handleBox || !targetBox) {
      throw new Error('The drag handles are not visible.')
    }

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height,
      { steps: 10 },
    )
    await page.mouse.up()
    await expect.poll(synonymValues).toEqual(['カラオケ配信', '歌ってみた'])
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

  for (const section of ['videos', 'talents', 'feedback']) {
    for (const { id, name } of [
      { id: '00000000-0000-0000-0000-000000000000', name: 'a missing ID' },
      { id: 'not-a-uuid', name: 'an ID that is not a UUID' },
    ]) {
      test(`should display not found for the ${section} detail page of ${name}`, async ({
        page,
      }) => {
        await page.goto(`http://localhost:4000/${section}/${id}`)

        await expect(
          page.getByRole('heading', { name: 'ページが見つかりません' }),
        ).toBeVisible()
        await expect(page.getByText('Application error')).toHaveCount(0)
      })
    }
  }
})
