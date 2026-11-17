'use client'

import { Search, UserRound, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  fetchRecommendedQueries,
  fetchSearchModalTalents,
  fetchSuggestions,
  type Suggestion,
} from '@/app/_lib/actions'
import { ListOption, ListOptionIcon } from '@/components/list-option'
import TalentChip, {
  TALENT_CHIP_REMOVE_CLASS_NAME,
} from '@/components/talent-chip'
import type { Talent } from '@/lib/fetchers'
import { parseTalentIds, TALENT_SEARCH_PARAM } from '@/lib/talent-filter'
import { findMatchingTalents } from '@/lib/talent-match'
import { getVideosPath } from '@/lib/video-kind-filter'
import { SearchModalRecommendedQueries } from './search-modal-recommended-queries'
import { SearchModalSectionHeading } from './search-modal-section-heading'

/** 矢印キーで移動できる候補（タレントとキーワード）に付ける属性 */
const OPTION_SELECTOR = '[data-search-modal-option]'

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
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  // `null` means the recommended queries are still loading
  const [recommendedQueries, setRecommendedQueries] = useState<string[] | null>(
    null,
  )
  const [talents, setTalents] = useState<Talent[]>([])
  const [selectedTalents, setSelectedTalents] = useState<Talent[]>([])
  // タレントで絞り込んだ動画一覧で開いたときは、そのタレントをチップにする。
  // 種別（`kind`）は引き継がない
  const [initialTalentIds] = useState(() =>
    isVideosPath(pathname) ? searchParams.getAll(TALENT_SEARCH_PARAM) : [],
  )

  const selectedTalentIds = useMemo(
    () => selectedTalents.map((talent) => talent.id),
    [selectedTalents],
  )
  const talentCandidates = useMemo(
    () => findMatchingTalents(talents, query, selectedTalentIds),
    [talents, query, selectedTalentIds],
  )

  // Fetch recommended queries on mount
  useEffect(() => {
    fetchRecommendedQueries()
      .then(setRecommendedQueries)
      .catch((err) => {
        console.debug('Failed to fetch recommended queries', err)
        setRecommendedQueries([])
      })
  }, [])

  // Fetch the talents on mount. They are matched against the input here
  useEffect(() => {
    let ignore = false

    fetchSearchModalTalents()
      .then((data) => {
        if (ignore) return

        setTalents(data)

        const ids = parseTalentIds(
          initialTalentIds,
          data.map((talent) => talent.id),
        )

        if (ids.length > 0) {
          setSelectedTalents(data.filter((talent) => ids.includes(talent.id)))
        }
      })
      .catch((err) => {
        console.debug('Failed to fetch talents', err)
      })

    return () => {
      ignore = true
    }
  }, [initialTalentIds])

  // Fetch suggestions when query changes
  useEffect(() => {
    if (!query) {
      setSuggestions(null)
      setIsLoadingSuggestions(false)
      return
    }

    setIsLoadingSuggestions(true)

    const getSuggestions = async () => {
      try {
        const data = await fetchSuggestions(query)
        setSuggestions(data)
      } catch (err) {
        console.debug('Failed to fetch suggestions', err)
        setSuggestions([])
      } finally {
        setIsLoadingSuggestions(false)
      }
    }

    // Debounce the search
    const timeoutId = setTimeout(getSuggestions, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const getOptions = useCallback(
    () =>
      Array.from(
        optionsRef.current?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ??
          [],
      ),
    [],
  )

  const selectTalent = useCallback((talent: Talent) => {
    setSelectedTalents((prev) => [...prev, talent])
    setQuery('')
    inputRef.current?.focus()
  }, [])

  const removeTalent = useCallback((talentId: string) => {
    setSelectedTalents((prev) =>
      prev.filter((talent) => talent.id !== talentId),
    )
    inputRef.current?.focus()
  }, [])

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !query && selectedTalents.length > 0) {
        e.preventDefault()
        setSelectedTalents((prev) => prev.slice(0, -1))
      } else if (e.key === 'ArrowDown') {
        const [firstOption] = getOptions()

        if (firstOption) {
          e.preventDefault()
          firstOption.focus()
        }
      }
    },
    [getOptions, query, selectedTalents.length],
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
              queries={recommendedQueries}
              talentIds={selectedTalentIds}
            />
          </>
        )}
      </div>
    </div>
  )
}
