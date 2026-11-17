import { expect, test } from '@playwright/test'

test.describe('Recommended Queries', () => {
  test('should show the added query in the list and a toast without reloading', async ({
    page,
  }) => {
    await page.goto('/recommended-queries')

    await expect(
      page.getByRole('heading', { level: 1, name: 'おすすめクエリ管理' }),
    ).toBeVisible()

    // Unique per run, since the mock Redis keeps the set between tests
    const query = `E2E クエリ ${test.info().testId}-${test.info().retry}`

    await page.getByLabel('新しい手動クエリを追加').fill(query)
    await page.getByRole('button', { exact: true, name: '追加' }).click()

    await expect(
      page.getByRole('region').getByText('クエリを追加しました。'),
    ).toBeVisible()
    // The list is updated by the action's revalidatePath, not router.refresh()
    await expect(
      page.getByRole('cell', { exact: true, name: query }),
    ).toBeVisible()
    await expect(page.getByLabel('新しい手動クエリを追加')).toHaveValue('')
  })
})
