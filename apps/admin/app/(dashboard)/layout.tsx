import { NavigationBar } from './_components/navigation-bar'

export type Props = {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: Props) {
  return (
    <div>
      <NavigationBar />
      <main>{children}</main>
    </div>
  )
}
