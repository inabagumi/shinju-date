import { type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export default function VideosLayout({ children }: Props) {
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8">{children}</main>
  )
}
