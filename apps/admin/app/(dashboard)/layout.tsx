import { ReactNode } from 'react'

export type Props = {
  children: ReactNode
}

export default function DashboardLayout({ children }: Props): JSX.Element {
  return (
    <>
      <main>{children}</main>
    </>
  )
}
