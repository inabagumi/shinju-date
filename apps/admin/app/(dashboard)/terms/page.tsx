import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  TermsList,
  TermsListSkeleton,
  TermsToolbar,
} from './_components/terms-list'
import getTerms from './_lib/get-terms'
import { filterTerms, groupTermsByInitial } from './_lib/group-terms'
import { termsSearchParamsSchema } from './_lib/search-params-schema'

export const metadata: Metadata = {
  title: '用語管理',
}

async function TermsListData({
  searchParams,
}: Pick<PageProps<'/terms'>, 'searchParams'>) {
  const [terms, rawParams] = await Promise.all([getTerms(), searchParams])
  const { search } = termsSearchParamsSchema.parse(rawParams)

  return (
    <TermsList
      groups={groupTermsByInitial(filterTerms(terms, search))}
      search={search}
    />
  )
}

export default function TermsPage({ searchParams }: PageProps<'/terms'>) {
  return (
    <div>
      <PageHeader
        description="検索に利用する用語、読み方、類義語を管理します。"
        title="用語管理"
      />
      <div className="space-y-6">
        <TermsToolbar />
        <Suspense fallback={<TermsListSkeleton />}>
          <TermsListData searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  )
}
