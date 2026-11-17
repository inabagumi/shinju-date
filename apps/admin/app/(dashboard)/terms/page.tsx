import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { TermsList } from './_components/terms-list'
import getTerms from './_lib/get-terms'

export const metadata: Metadata = {
  title: '用語管理',
}

export default function TermsPage() {
  return (
    <div>
      <PageHeader
        description="検索に利用する用語、読み方、類義語を管理します。"
        title="用語管理"
      />
      <TermsList terms={getTerms()} />
    </div>
  )
}
