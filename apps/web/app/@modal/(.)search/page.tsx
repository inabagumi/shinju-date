import { SearchModalContent } from './search-modal-content'

export default async function SearchModalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const initialQuery = params.q ?? ''

  return <SearchModalContent initialQuery={initialQuery} />
}
