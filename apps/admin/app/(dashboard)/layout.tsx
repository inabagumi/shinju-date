import Link from 'next/link'
import type { ReactNode } from 'react'
import Form, { Button } from '@/components/form'
import { signOut } from './_lib/actions'

export type Props = {
  children: ReactNode
}

export default function DashboardLayout({ children }: Props) {
  return (
    <div>
      <nav className="sticky flex bg-slate-800 p-2 text-slate-50">
        <Link className="inline-block p-2 font-semibold text-xl" href="/">
          Admin UI
        </Link>
        <div className="flex grow items-center gap-4">
          <Link
            className="rounded-md px-3 py-1 hover:bg-slate-700"
            href="/videos"
          >
            動画管理
          </Link>
          <Link
            className="rounded-md px-3 py-1 hover:bg-slate-700"
            href="/terms"
          >
            用語管理
          </Link>
          <Link
            className="rounded-md px-3 py-1 hover:bg-slate-700"
            href="/analytics/search"
          >
            検索アナリティクス
          </Link>
          <Link
            className="rounded-md px-3 py-1 hover:bg-slate-700"
            href="/analytics/click"
          >
            クリックアナリティクス
          </Link>
        </div>
        <div className="flex items-center">
          <Form action={signOut}>
            <Button
              className="rounded-md bg-slate-500 px-2 py-1 text-slate-50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 active:bg-slate-600 active:shadow-inner disabled:pointer-events-none disabled:bg-slate-400"
              type="submit"
            >
              ログアウト
            </Button>
          </Form>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
