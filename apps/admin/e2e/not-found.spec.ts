import { expect, test } from '@playwright/test'

test.describe('Not Found', () => {
  test('should display the custom 404 page with the navigation bar for unmatched URLs', async ({
    page,
  }) => {
    const response = await page.goto('/nope-nope')

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
        await page.goto(`/${section}/${id}`)

        await expect(
          page.getByRole('heading', { name: 'ページが見つかりません' }),
        ).toBeVisible()
        await expect(page.getByText('Application error')).toHaveCount(0)
      })
    }
  }
})
