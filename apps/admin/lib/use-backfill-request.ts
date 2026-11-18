'use client'

import { type ServerActionResult, useServerAction } from './use-server-action'

/**
 * 過去動画の取り込みをキューに追加する Server Action の戻り値。成功のトーストの文は
 * `data.message` に入れる
 */
interface BackfillRequestResult extends ServerActionResult {
  data?: { message?: string | undefined } | undefined
}

/**
 * 過去動画の取り込みをキューに追加し、結果をトーストで知らせてから、進捗を取り直す。
 * 返す関数は、取り直しが終わると解決する（`ConfirmDialog` の `onConfirm` に渡すと、
 * それまでダイアログが実行中の表示になる）
 */
export function useBackfillRequest<TArgs extends unknown[]>(
  action: (...args: TArgs) => Promise<BackfillRequestResult>,
  reload: () => Promise<void>,
): (...args: TArgs) => Promise<void> {
  const { run } = useServerAction(action, {
    errorText: 'キューへの追加に失敗しました。',
    successText: (result) => result.data?.message ?? 'キューに追加しました。',
  })

  return async (...args) => {
    await run(...args)
    await reload()
  }
}
