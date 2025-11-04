import { Suspense } from 'react'
import SearchIcon from '@/app/_components/search-icon'
import { AsyncInput, InputSkeleton } from './_components/async-input'
import { SearchModal, SearchModalTitle } from './_components/search-modal'
import { Suggestions } from './_components/suggestions'
import { searchAction } from './_lib/actions'
import { searchParamsSchema } from './_lib/search-params-schema'

export default function SearchModalPage({
  searchParams,
}: PageProps<'/search'>) {
  const parsedSearchParams = searchParams.then((params) => {
    const { data, error } = searchParamsSchema.safeParse(params)

    if (error) {
      return {}
    }

    return data
  })

  return (
    <SearchModal>
      <div className="flex flex-col">
        <form
          action={searchAction}
          className="flex items-center border-774-nevy-200 border-b dark:border-zinc-700"
        >
          <SearchIcon className="ml-4 size-5 text-774-nevy-400 dark:text-774-nevy-300" />

          <SearchModalTitle className="sr-only">検索</SearchModalTitle>

          <Suspense fallback={<InputSkeleton />}>
            <AsyncInput searchParams={parsedSearchParams} />
          </Suspense>

          <div className="mr-4 flex items-center gap-2">
            <kbd className="hidden rounded border border-774-nevy-200 bg-774-nevy-100 px-2 py-1 font-mono text-774-nevy-500 text-xs sm:inline-block dark:border-zinc-700 dark:bg-zinc-800 dark:text-774-nevy-300">
              ESC
            </kbd>
          </div>
        </form>

        <Suspense fallback={<div>Loading...</div>}>
          <Suggestions searchParams={parsedSearchParams} />
        </Suspense>
      </div>
    </SearchModal>
  )
}
