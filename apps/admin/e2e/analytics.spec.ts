import { expect, test } from '@playwright/test'

test.describe('Analytics', () => {
  test('should display the click volume and the popular videos', async ({
    page,
  }) => {
    await page.goto('/analytics/click')

    await expect(
      page.getByRole('heading', { level: 1, name: 'クリックアナリティクス' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: '過去7日間', pressed: true }),
    ).toBeVisible()
    await expect(page.getByRole('term').getByText('総クリック数')).toBeVisible()
    await expect(
      page.getByRole('tab', { name: '人気動画', selected: true }),
    ).toBeVisible()

    // The ranking links each video to its detail page
    const ranking = page.getByRole('table')
    await expect(
      ranking.getByRole('columnheader', { name: 'クリック数' }),
    ).toBeVisible()
    await expect(
      ranking.getByRole('row').nth(1).getByRole('link'),
    ).toHaveAttribute('href', /^\/videos\/[0-9a-f-]{36}$/)
  })

  test('should display the search volume and the quality metrics', async ({
    page,
  }) => {
    await page.goto('/analytics/search')

    await expect(
      page.getByRole('heading', { level: 1, name: '検索アナリティクス' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: '過去7日間', pressed: true }),
    ).toBeVisible()
    await expect(page.getByRole('term').getByText('総検索数')).toBeVisible()
    await expect(
      page.getByRole('term').getByText('検索利用率', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 3, name: '検索結果ゼロのキーワード' }),
    ).toBeVisible()
  })
})
