import { expect, test as setup } from '@playwright/test'
import { STORAGE_STATE } from './storage-state'

setup('sign in as the admin', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('メールアドレス').fill('admin@example.com')
  await page.getByLabel('パスワード').fill('password123')
  await page.getByRole('button', { name: 'ログイン' }).click()

  // The session cookie is set once the dashboard is shown
  await expect(
    page.getByRole('heading', { level: 1, name: 'ダッシュボード' }),
  ).toBeVisible()

  await page.context().storageState({ path: STORAGE_STATE })
})
