'use client'

import * as Sentry from '@sentry/nextjs'
import { Button } from '@shinju-date/ui'
import Link from 'next/link'
import { useEffect } from 'react'
import SimpleDocument from '@/components/simple-document'

interface ErrorPageProps {
  error: unknown
  retry: () => void
}

/**
 * データの取得などに失敗したページの代わりに表示する。ルートレイアウトの
 * 内側に表示されるため、ヘッダーとフッターは残る。
 */
export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <SimpleDocument title="ページを表示できませんでした">
      <div className="space-y-8" role="alert">
        <p className="text-body">
          データの読み込み中にエラーが発生しました。時間をおいて再試行してください。
        </p>

        <ul className="flex flex-wrap gap-4">
          <li>
            <Button onClick={() => retry()} size="lg">
              再試行
            </Button>
          </li>
          <li>
            <Button asChild size="lg" variant="secondary">
              <Link href="/">トップページへ</Link>
            </Button>
          </li>
        </ul>
      </div>
    </SimpleDocument>
  )
}
