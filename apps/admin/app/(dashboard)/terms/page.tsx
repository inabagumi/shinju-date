import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { TermsList } from './_components/terms-list'
import getTerms from './_lib/get-terms'

export const metadata: Metadata = {
  title: '用語管理',
}

async function getTermsData() {
  'use cache: private'

  cacheLife('minutes')

  return getTerms()
}

export default function TermsPage() {
  return (
    <div>
      <PageHeader
        description="検索に利用する用語、読み方、類義語を管理します。"
        title="用語管理"
      />
      <TermsList terms={getTermsData()} />
    </div>
  )
}
