import { cacheLife } from 'next/cache'
import { TermsList } from './_components/terms-list'
import getTerms from './_lib/get-terms'

async function getTermsData() {
  'use cache: private'
  cacheLife('minutes')

  return getTerms()
}

export default function TermsPage() {
  return (
    <div className="space-y-6">
      <p className="text-gray-600 text-sm">
        検索に利用する用語、読み方、類義語を管理します。
      </p>
      <TermsList terms={getTermsData()} />
    </div>
  )
}
