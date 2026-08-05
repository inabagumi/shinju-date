'use client'

import * as Accordion from '@radix-ui/react-accordion'
import { range } from '@shinju-date/helpers'
import { Button, Input } from '@shinju-date/ui'
import { Suspense, use, useMemo, useState } from 'react'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { TermModal } from './term-modal'

interface Term {
  id: string
  term: string
  readings: string[]
  synonyms: string[]
}

interface TermsListProps {
  terms: Promise<Term[]>
}

// Helper function to get the first character for grouping
function getFirstCharacter(term: string): string {
  const firstChar = term.charAt(0).toUpperCase()
  // Katakana ranges
  const hiraganaRanges = [
    { end: 'オ', group: 'ア', start: 'ア' },
    { end: 'ゴ', group: 'カ', start: 'カ' },
    { end: 'ゾ', group: 'サ', start: 'サ' },
    { end: 'ド', group: 'タ', start: 'タ' },
    { end: 'ノ', group: 'ナ', start: 'ナ' },
    { end: 'ポ', group: 'ハ', start: 'ハ' },
    { end: 'モ', group: 'マ', start: 'マ' },
    { end: 'ヨ', group: 'ヤ', start: 'ヤ' },
    { end: 'ロ', group: 'ラ', start: 'ラ' },
    { end: 'ン', group: 'ワ', start: 'ワ' },
  ]

  for (const range of hiraganaRanges) {
    if (firstChar >= range.start && firstChar <= range.end) {
      return range.group
    }
  }

  // If not hiragana, return first character as-is
  return firstChar
}

export function TermsList({ terms }: TermsListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="sm:max-w-md"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="用語、読み方、類義語で検索..."
          type="text"
          value={searchQuery}
        />
        <TermModal />
      </div>

      <Suspense fallback={<TermsResultsSkeleton />}>
        <TermsResults searchQuery={searchQuery} terms={terms} />
      </Suspense>
    </div>
  )
}

function TermsResults({
  searchQuery,
  terms,
}: TermsListProps & { searchQuery: string }) {
  const resolvedTerms = use(terms)

  // Filter terms based on search query
  const filteredTerms = useMemo(() => {
    if (!searchQuery.trim()) return resolvedTerms

    const query = searchQuery.toLowerCase()
    return resolvedTerms.filter(
      (term) =>
        term.term.toLowerCase().includes(query) ||
        term.readings.some((reading) =>
          reading.toLowerCase().includes(query),
        ) ||
        term.synonyms.some((synonym) => synonym.toLowerCase().includes(query)),
    )
  }, [resolvedTerms, searchQuery])

  // Group terms by first character
  const groupedTerms = useMemo(() => {
    const groups = new Map<string, Term[]>()

    for (const term of filteredTerms) {
      const group = getFirstCharacter(term.readings[0] || term.term)
      if (!groups.has(group)) {
        groups.set(group, [])
      }
      groups.get(group)?.push(term)
    }

    // Sort groups by key
    return new Map([...groups.entries()].toSorted())
  }, [filteredTerms])

  const groupKeys = Array.from(groupedTerms.keys())

  const scrollToGroup = (group: string) => {
    const element = document.getElementById(`group-${group}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Alphabet navigation */}
      {groupKeys.length > 0 && !searchQuery && (
        <nav className="flex flex-wrap gap-2 rounded-md border border-774-blue-300 bg-774-blue-50 p-3">
          {groupKeys.map((group) => (
            <Button
              className="rounded px-2 py-1 text-sm hover:bg-secondary-blue hover:text-secondary-blue-foreground"
              key={group}
              onClick={() => scrollToGroup(group)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {group}
            </Button>
          ))}
        </nav>
      )}

      {/* Terms list */}
      {filteredTerms.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          {searchQuery ? '検索結果がありません。' : '用語がありません。'}
        </p>
      ) : (
        <Accordion.Root className="space-y-2" type="multiple">
          {Array.from(groupedTerms.entries()).map(([group, groupTerms]) => (
            <div id={`group-${group}`} key={group}>
              <Accordion.Item
                className="overflow-hidden rounded-lg border border-774-blue-300"
                value={group}
              >
                <Accordion.Header>
                  <Accordion.Trigger className="flex w-full items-center justify-between bg-774-blue-50 px-4 py-3 text-left font-semibold hover:bg-774-blue-100">
                    <span>
                      {group} ({groupTerms.length})
                    </span>
                    <span className="transition-transform duration-200 [&[data-state=open]]:rotate-180">
                      ▼
                    </span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden bg-white data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="divide-y divide-774-blue-200">
                    {groupTerms.map((term) => (
                      <div className="p-4" key={term.id}>
                        <div className="mb-2 flex items-start justify-between">
                          <h3 className="font-semibold text-lg">{term.term}</h3>
                          <div className="flex gap-2">
                            <TermModal term={term} />
                            <DeleteConfirmDialog
                              termId={term.id}
                              termName={term.term}
                            />
                          </div>
                        </div>
                        {term.readings.length > 0 && (
                          <div className="mb-2">
                            <span className="font-medium text-gray-700 text-sm">
                              読み方:
                            </span>
                            <span className="ml-2 text-gray-600 text-sm">
                              {term.readings.join(', ')}
                            </span>
                          </div>
                        )}
                        {term.synonyms.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700 text-sm">
                              類義語:
                            </span>
                            <span className="ml-2 text-gray-600 text-sm">
                              {term.synonyms.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            </div>
          ))}
        </Accordion.Root>
      )}
    </div>
  )
}

function TermsResultsSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-6">
      <div className="flex min-h-16 flex-wrap gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
        {range(8).map((item) => (
          <div
            className="h-8 w-10 rounded bg-gray-200"
            key={`term-index-skeleton-${item}`}
          />
        ))}
      </div>
      {range(5).map((item) => (
        <div
          className="h-12 rounded-lg border border-gray-200 bg-gray-100"
          key={`term-group-skeleton-${item}`}
        />
      ))}
    </div>
  )
}
