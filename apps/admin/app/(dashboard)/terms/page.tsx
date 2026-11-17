import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { TermsList } from './_components/terms-list'
import getTerms from './_lib/get-terms'
import {
  type TermsSearchParams,
  termsSearchParamsSchema,
} from './_lib/search-params-schema'

export const metadata: Metadata = {
  title: '用語管理',
}

async function getFilters(
  searchParams: PageProps<'/terms'>['searchParams'],
): Promise<TermsSearchParams> {
  return termsSearchParamsSchema.parse(await searchParams)
}

export default function TermsPage({ searchParams }: PageProps<'/terms'>) {
  return (
    <div>
      <PageHeader
        description="検索に利用する用語、読み方、類義語を管理します。"
        title="用語管理"
      />
      <TermsList filters={getFilters(searchParams)} terms={getTerms()} />
    </div>
  )
}
