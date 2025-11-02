import { logger } from '@shinju-date/logger'

type RevalidateOptions = {
  signal?: AbortSignal | undefined
}

/**
 * 公開サイトのキャッシュを再検証する
 *
 * 環境変数:
 * - REVALIDATE_URL: 再検証APIのエンドポイントURL
 * - REVALIDATE_SECRET_TOKEN: 認証用のBearerトークン
 *
 * @param tags - 再検証するキャッシュタグの配列
 * @param options - オプション (signal: AbortSignal)
 */
export async function revalidateTags(
  tags: string[],
  { signal }: RevalidateOptions = {},
): Promise<void> {
  const revalidateUrl = process.env['REVALIDATE_URL']
  const secretToken = process.env['REVALIDATE_SECRET_TOKEN']

  if (!revalidateUrl || tags.length === 0) {
    return
  }

  try {
    const res = await fetch(revalidateUrl, {
      body: JSON.stringify({
        tags,
      }),
      headers: {
        'Content-Type': 'application/json',
        ...(secretToken ? { Authorization: `Bearer ${secretToken}` } : {}),
      },
      method: 'POST',
      signal: signal ?? null,
    })

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}))
      throw new Error('Webキャッシュの再検証に失敗しました', {
        cause: errorBody,
      })
    }

    logger.info('Webキャッシュの再検証をリクエストしました', {
      tags: tags.join(', '),
    })
  } catch (error) {
    logger.error('Webキャッシュの再検証中にエラーが発生しました', {
      error,
      tags: tags.join(', '),
    })
    // エラーをスローせず、ログのみ記録する
    // これにより、キャッシュ再検証の失敗がメイン処理に影響しない
  }
}
