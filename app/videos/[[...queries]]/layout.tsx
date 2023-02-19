import { type ReactNode } from 'react'
import { SkipNavContent } from '@/ui/skip-nav'

type Props = {
  children: ReactNode
}

export default function VideosLayout({ children }: Props): JSX.Element {
  return (
    <SkipNavContent>
      <div className="container">{children}</div>
    </SkipNavContent>
  )
}
