import { type ReactNode } from 'react'
import SimpleDocument from '@/components/simple-document'
import { title as siteName } from '@/lib/constants'

export default function Template({ children }: { children: ReactNode }) {
  return (
    <SimpleDocument title={`${siteName}とは?`} withBreadcrumbs>
      <div className="markdown">{children}</div>
    </SimpleDocument>
  )
}
