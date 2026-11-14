import type { ReactNode } from 'react'
import { MAIN_CONTENT_ID } from '@/components/skip-link'

interface Props {
  children: ReactNode
}

export default function VideosLayout({ children }: Props) {
  return (
    <main
      className="mx-auto grid max-w-6xl scroll-mt-20 gap-8 px-4 py-8"
      id={MAIN_CONTENT_ID}
    >
      {children}
    </main>
  )
}
