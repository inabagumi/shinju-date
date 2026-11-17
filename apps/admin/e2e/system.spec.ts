import { expect, test } from '@playwright/test'

test.describe('System', () => {
  test('should display the maintenance mode and the recent activity', async ({
    page,
  }) => {
    await page.goto('/system')

    await expect(
      page.getByRole('heading', { level: 1, name: 'システム' }),
    ).toBeVisible()
    await expect(
      page.getByRole('switch', { name: 'メンテナンスモード切り替え' }),
    ).toBeVisible()
    // Other tests add their own logs, so only check that the logs are listed
    await expect(
      page
        .getByRole('listitem')
        .filter({ hasText: /^admin@example\.com が.+しました/ })
        .first(),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: '取得漏れをチェックする' }),
    ).toBeVisible()
    await expect(
      page.getByRole('region', { name: '最後の取り込みが失敗したアカウント' }),
    ).toBeVisible()
  })
})
