import Link from 'next/link'
import { type ReactNode } from 'react'
import Form, { Button } from '@/components/form'
import { signOut } from './_lib/actions'

export type Props = {
  children: ReactNode
}

export default function DashboardLayout({ children }: Props) {
  return (
    <div>
      <nav className="sticky flex bg-slate-800 p-2 text-slate-50">
        <Link className="inline-block p-2 text-xl font-semibold" href="/">
          Admin UI
        </Link>
        <div className="flex grow items-center justify-end">
          <Form action={signOut}>
            <Button
              className="rounded-md bg-slate-500 py-1 px-2 text-slate-50 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 focus-visible:outline-none active:bg-slate-600 active:shadow-inner disabled:pointer-events-none disabled:bg-slate-400"
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
