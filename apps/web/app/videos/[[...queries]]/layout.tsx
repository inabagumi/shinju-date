import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function VideosLayout({ children }: Props) {
  return <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
}
