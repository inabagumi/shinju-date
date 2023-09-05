import { type ReactNode } from 'react'
import SimpleDocument from '@/components/simple-document'

export default function Template({ children }: { children: ReactNode }) {
  return (
    <SimpleDocument title="利用規約" withBreadcrumbs>
      <div className="markdown">{children}</div>
    </SimpleDocument>
  )
}
