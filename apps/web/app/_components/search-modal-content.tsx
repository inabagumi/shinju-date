'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search, UserRound, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  type KeyboardEvent,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  fetchRecommendedQueries,
  fetchSearchModalTalents,
  fetchSuggestions,
} from '@/app/_lib/actions'
import { ListOption, ListOptionIcon } from '@/components/list-option'
import TalentChip, {
  TALENT_CHIP_REMOVE_CLASS_NAME,
} from '@/components/talent-chip'
import type { Talent } from '@/lib/data/talents'
import { queryKeys } from '@/lib/query-keys'
import { parseTalentIds, TALENT_SEARCH_PARAM } from '@/lib/talent-filter'
import { findMatchingTalents } from '@/lib/talent-match'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { getVideosPath } from '@/lib/video-kind-filter'
import { SearchModalRecommendedQueries } from './search-modal-recommended-queries'
import { SearchModalSectionHeading } from './search-modal-section-heading'

/** 矢印キーで移動できる候補（タレントとキーワード）に付ける属性 */
const OPTION_SELECTOR = '[data-search-modal-option]'

/** サジェストを取得するまでに、入力を待つ時間（ミリ秒） */
const SUGGESTION_DEBOUNCE_MS = 300

/**
 * おすすめの検索キーワードとタレントの一覧は、モーダルを開き直すたびには
 * 取り直さない
 */
const SEARCH_MODAL_STALE_TIME = 5 * 60 * 1000

const NO_TALENTS: Talent[] = []

function isVideosPath(pathname: string): boolean {
  return pathname === '/videos' || pathname.startsWith('/videos/')
}

interface SearchModalContentProps {
  onClose: () => void
}

export function SearchModalContent({ onClose }: SearchModalContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const talentHeadingId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  // `null` until the chips are changed. Until then, the chips of the talent
  // filter of the video list are shown
  const [changedTalents, setChangedTalents] = useState<Talent[] | null>(null)
  // タレントで絞り込んだ動画一覧で開いたときは、そのタレントをチップにする。
  // 種別（`kind`）は引き継がない
  const [initialTalentIds] = useState(() =>
    isVideosPath(pathname) ? searchParams.getAll(TALENT_SEARCH_PARAM) : [],
  )

  const { data: recommendedQueries, isError: isRecommendedQueriesError } =
    useQuery({
      queryFn: () => fetchRecommendedQueries(),
      queryKey: queryKeys.searchModalRecommendedQueries(),
      staleTime: SEARCH_MODAL_STALE_TIME,
    })

  // The talents are matched against the input here
  const { data: talents = NO_TALENTS } = useQuery({
    queryFn: () => fetchSearchModalTalents(),
    queryKey: queryKeys.searchModalTalents(),
    staleTime: SEARCH_MODAL_STALE_TIME,
  })

  const debouncedQuery = useDebouncedValue(query, SUGGESTION_DEBOUNCE_MS)
  const { data: suggestions, isError: isSuggestionsError } = useQuery({
    enabled: debouncedQuery !== '',
    // Keep showing the previous suggestions while fetching the new ones
    placeholderData: keepPreviousData,
    queryFn: () => fetchSuggestions(debouncedQuery),
    queryKey: queryKeys.searchModalSuggestions(debouncedQuery),
  })
  const isLoadingSuggestions = !suggestions && !isSuggestionsError

  const initialTalents = useMemo(() => {
    const ids = parseTalentIds(
      initialTalentIds,
      talents.map((talent) => talent.id),
    )

    return talents.filter((talent) => ids.includes(talent.id))
  }, [initialTalentIds, talents])
  const selectedTalents = changedTalents ?? initialTalents

  const selectedTalentIds = useMemo(
    () => selectedTalents.map((talent) => talent.id),
    [selectedTalents],
  )
  const talentCandidates = useMemo(
    () => findMatchingTalents(talents, query, selectedTalentIds),
    [talents, query, selectedTalentIds],
  )

  const getOptions = useCallback(
    () =>
      Array.from(
        optionsRef.current?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ??
          [],
      ),
    [],
  )

  const selectTalent = useCallback(
    (talent: Talent) => {
      setChangedTalents([...selectedTalents, talent])
      setQuery('')
      inputRef.current?.focus()
    },
    [selectedTalents],
  )

  const removeTalent = useCallback(
    (talentId: string) => {
      setChangedTalents(
        selectedTalents.filter((talent) => talent.id !== talentId),
      )
      inputRef.current?.focus()
    },
    [selectedTalents],
  )

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !query && selectedTalents.length > 0) {
        e.preventDefault()
        setChangedTalents(selectedTalents.slice(0, -1))
      } else if (e.key === 'ArrowDown') {
        const [firstOption] = getOptions()

        if (firstOption) {
          e.preventDefault()
          firstOption.focus()
        }
      }
    },
    [getOptions, query, selectedTalents],
  )

  const handleOptionKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return

      e.preventDefault()

      const options = getOptions()
      const index = options.indexOf(e.currentTarget)

      if (e.key === 'ArrowDown') {
        options[index + 1]?.focus()
      } else if (index <= 0) {
        inputRef.current?.focus()
      } else {
        options[index - 1]?.focus()
      }
    },
    [getOptions],
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      const trimmedQuery = query.trim()

      if (!trimmedQuery && selectedTalentIds.length === 0) return

      onClose()
      router.push(getVideosPath(trimmedQuery, 'all', selectedTalentIds))
    },
    [query, onClose, router, selectedTalentIds],
  )

  const handleSuggestionClick = useCallback(() => {
    onClose()
  }, [onClose])

  const hasTalents = selectedTalents.length > 0

  return (
    <div className="flex flex-col">
      <form
        className="flex items-center border-b border-border"
        onSubmit={handleSubmit}
      >
        <Search
          aria-hidden="true"
          className="ml-4 size-5 shrink-0 text-muted"
        />

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 px-4 py-3">
          {hasTalents && (
            <ul
              aria-label="選んでいるタレント"
              className="flex max-w-full flex-wrap gap-2"
            >
              {selectedTalents.map((talent) => (
                <TalentChip key={talent.id} name={talent.name}>
                  <button
                    aria-label={`${talent.name}を外す`}
                    className={TALENT_CHIP_REMOVE_CLASS_NAME}
                    onClick={() => removeTalent(talent.id)}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </TalentChip>
              ))}
            </ul>
          )}

          <input
            className="min-w-32 flex-1 bg-transparent py-1 text-foreground outline-none placeholder:text-muted"
            name="q"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="検索..."
            ref={inputRef}
            type="search"
            value={query}
          />
        </div>

        <div className="mr-4 flex items-center gap-2">
          <kbd className="hidden rounded-control border border-border bg-muted px-2 py-1 font-mono text-caption text-muted sm:inline-block">
            ESC
          </kbd>
        </div>
      </form>

      {/* Search suggestions */}
      <div ref={optionsRef}>
        {query ? (
          <div className="max-h-96 overflow-y-auto">
            {talentCandidates.length > 0 && (
              <section aria-labelledby={talentHeadingId}>
                <SearchModalSectionHeading id={talentHeadingId}>
                  タレント
                </SearchModalSectionHeading>
                <div className="p-2">
                  {talentCandidates.map((talent) => (
                    <ListOption
                      data-search-modal-option
                      data-talent-option
                      key={talent.id}
                      onClick={() => selectTalent(talent)}
                      onKeyDown={handleOptionKeyDown}
                    >
                      <ListOptionIcon>
                        <UserRound />
                      </ListOptionIcon>
                      <span>{talent.name}</span>
                    </ListOption>
                  ))}
                </div>
              </section>
            )}

            <div
              className={
                talentCandidates.length > 0
                  ? 'border-t border-border'
                  : undefined
              }
            >
              {isLoadingSuggestions ? (
                <div className="p-8 text-center text-meta text-muted">
                  読み込み中...
                </div>
              ) : suggestions && suggestions.length > 0 ? (
                <div className="p-2">
                  {suggestions.map((suggestion) => (
                    <ListOption asChild key={suggestion.term}>
                      <Link
                        data-search-modal-option
                        data-suggestion-link
                        href={getVideosPath(
                          suggestion.term,
                          'all',
                          selectedTalentIds,
                        )}
                        onClick={handleSuggestionClick}
                        onKeyDown={handleOptionKeyDown}
                      >
                        <ListOptionIcon>
                          <Search />
                        </ListOptionIcon>
                        <span>{suggestion.term}</span>
                      </Link>
                    </ListOption>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-meta text-muted">
                  {hasTalents
                    ? `Enterキーを押して、選んだタレントの動画から「${query}」を検索`
                    : `Enterキーを押して「${query}」を検索`}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {hasTalents && (
              <p className="border-b border-border px-4 py-3 text-meta text-muted">
                Enterキーを押して、選んだタレントの動画を表示
              </p>
            )}
            <SearchModalRecommendedQueries
              onClickLink={handleSuggestionClick}
              queries={
                isRecommendedQueriesError ? [] : (recommendedQueries ?? null)
              }
              talentIds={selectedTalentIds}
            />
          </>
        )}
      </div>
    </div>
  )
}
