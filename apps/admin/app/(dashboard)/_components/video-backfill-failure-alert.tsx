import { formatNumber } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { countVideoBackfillFailures } from '../_lib/count-video-backfill-failures'

/**
 * Tells admins that the latest backfill of some accounts failed, so that they
 * can request them again. Renders nothing while there is no failure, or when
 * the failures cannot be counted.
 */
export async function VideoBackfillFailureAlert() {
  let failures: number

  try {
    failures = await countVideoBackfillFailures()
  } catch (error) {
    logger.warn('失敗した過去動画の取り込みを数えられませんでした', { error })

    return null
  }

  if (failures === 0) {
    return null
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      role="status"
    >
      <p className="flex items-center gap-2">
        <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
        過去動画の取り込みが失敗したアカウントが{formatNumber(failures)}
        件あります。
      </p>
      <Link
        className="font-medium underline"
        href="/system#video-backfill-history"
      >
        履歴を確認して再試行する
      </Link>
    </div>
  )
}
