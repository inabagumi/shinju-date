import { expect, test } from '@playwright/test'

const MESSAGES = [
  '配信予定をカレンダーアプリに登録できるようにしてほしいです。',
  '特定のタレントの動画だけを表示できるようにしてください。',
]

test.describe('Feedback', () => {
  test('should display the feature requests of the mock data', async ({
    page,
  }) => {
    await page.goto('/feedback')

    await expect(
      page.getByRole('heading', { level: 1, name: '機能要望管理' }),
    ).toBeVisible()
    await expect(
      page.getByRole('columnheader', { name: '送信日時' }),
    ).toBeVisible()

    for (const message of MESSAGES) {
      await expect(
        page.getByRole('link', { name: message }).first(),
      ).toHaveAttribute('href', /^\/feedback\/[0-9a-f-]{36}$/)
    }
  })

  test('should open a feature request and change its status', async ({
    page,
  }) => {
    const [message = ''] = MESSAGES

    await page.goto('/feedback')
    await page.getByRole('link', { name: message }).click()

    await expect(page).toHaveURL(/\/feedback\/[0-9a-f-]{36}$/)
    await expect(
      page.getByRole('heading', { level: 1, name: '機能要望詳細' }),
    ).toBeVisible()
    await expect(
      page.getByRole('paragraph').filter({ hasText: message }),
    ).toBeVisible()

    // Next.js may keep a hidden copy of streamed content in the DOM, so
    // only match the visible element.
    const status = page.getByLabel('対応ステータス').filter({ visible: true })
    // Retries and repeated runs share the mock database, so pick a status
    // other than the current one
    const [nextStatus, nextLabel] =
      (await status.inputValue()) === 'in_progress'
        ? ['resolved', '対応済み']
        : ['in_progress', '対応中']

    await status.selectOption(nextStatus)
    await page.getByRole('button', { name: 'ステータスを更新' }).click()
    await expect(page.getByText('更新しました。')).toBeVisible()

    // The list shows the new status
    await page.getByRole('link', { name: '機能要望一覧に戻る' }).click()
    await expect(
      page
        .getByRole('row')
        .filter({ hasText: message })
        .getByRole('cell')
        .first(),
    ).toHaveText(new RegExp(`^${nextLabel}`))
  })

  test('should filter the feature requests on the server through the URL', async ({
    page,
  }) => {
    await page.goto('/feedback')

    await page.getByLabel('既読状態').selectOption('read')
    await expect(page).toHaveURL(/\/feedback\?read=read$/)

    // Every remaining row is read
    await expect(page.getByRole('row').filter({ hasText: '未読' })).toHaveCount(
      0,
    )

    await page.getByLabel('既読状態').selectOption('all')
    await expect(page).toHaveURL(/\/feedback$/)
  })
})
