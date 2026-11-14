import type { Metadata } from 'next'
import { NotFoundContent } from './(dashboard)/_components/not-found-content'
import DashboardLayout from './(dashboard)/layout'

export const metadata: Metadata = {
  title: 'ページが見つかりません',
}

// Unmatched URLs render this file inside the root layout only, so wrap it in
// the dashboard layout to keep the navigation bar.
export default function NotFound() {
  return (
    <DashboardLayout>
      <NotFoundContent />
    </DashboardLayout>
  )
}
