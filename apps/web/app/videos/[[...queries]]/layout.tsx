import type { ReactNode } from 'react'
import PageMain from '@/components/page-main'

interface Props {
  children: ReactNode
}

export default function VideosLayout({ children }: Props) {
  return <PageMain>{children}</PageMain>
}
