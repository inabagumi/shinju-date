import { Header } from './_components/header'

export type Props = {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: Props) {
  return (
    <div>
      <Header />
      <main>{children}</main>
    </div>
  )
}
