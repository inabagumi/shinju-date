import { SearchResultsSkeleton } from '@/components/search-results'

export default function Loading() {
  return (
    <>
      <h1 className="text-xl font-semibold">
        <span className="inline-block h-8 w-64 animate-pulse rounded-md bg-774-nevy-100 dark:bg-zinc-800" />
      </h1>

      <SearchResultsSkeleton />
    </>
  )
}
