import { type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export default function VideosLayout({ children }: Props): JSX.Element {
  return <div className="container">{children}</div>
}
