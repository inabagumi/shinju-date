import { expect, test } from '@playwright/test'

test.describe('Account', () => {
  test('should display the forms to change the email and the password', async ({
    page,
  }) => {
    await page.goto('/account')

    await expect(
      page.getByRole('heading', { level: 1, name: 'アカウント設定' }),
    ).toBeVisible()
    await expect(
      page.getByText('現在のメールアドレス: admin@example.com'),
    ).toBeVisible()
    await expect(page.getByLabel('新しいメールアドレス')).toBeVisible()
    await expect(page.getByLabel('現在のパスワード')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'パスワードを更新' }),
    ).toBeVisible()
  })
})
