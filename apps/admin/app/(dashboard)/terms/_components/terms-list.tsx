'use client'

import { range } from '@shinju-date/helpers'
import {
  Button,
  EmptyState,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shinju-date/ui'
import { BookOpen } from 'lucide-react'
import { Fragment, Suspense, use, useMemo, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { deleteTermAction } from '../_actions'
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
          aria-label="用語を検索"
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

  if (filteredTerms.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen />}
        title={searchQuery ? '検索結果がありません。' : '用語がありません。'}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Index of first characters */}
      {groupKeys.length > 0 && !searchQuery && (
        <nav aria-label="頭文字の索引" className="flex flex-wrap gap-1">
          {groupKeys.map((group) => (
            <Button
              className="min-w-9 px-2"
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

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>用語</TableHead>
            <TableHead>読み方</TableHead>
            <TableHead>類義語</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(groupedTerms.entries()).map(([group, groupTerms]) => (
            <Fragment key={group}>
              <TableRow
                className="scroll-mt-16 bg-muted/50 hover:bg-muted/50"
                id={`group-${group}`}
              >
                <TableHead
                  className="py-2 text-foreground"
                  colSpan={4}
                  scope="colgroup"
                >
                  {group}
                  <span className="ml-2 font-normal text-muted tabular-nums">
                    {groupTerms.length}件
                  </span>
                </TableHead>
              </TableRow>
              {groupTerms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell className="font-semibold">{term.term}</TableCell>
                  <TableCell className="whitespace-normal text-muted">
                    {term.readings.join('、') || '—'}
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted">
                    {term.synonyms.join('、') || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-4">
                      <TermModal term={term} />
                      <ConfirmDialog
                        confirmLabel="削除"
                        confirmVariant="danger"
                        description={`本当に「${term.term}」を削除しますか？この操作は取り消せません。`}
                        onConfirm={() => deleteTermAction(term.id)}
                        title="用語を削除"
                        trigger={
                          <Button size="sm" variant="danger">
                            削除
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TermsResultsSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-4">
      <div className="flex min-h-8 flex-wrap gap-1">
        {range(8).map((item) => (
          <div
            className="h-8 w-9 rounded-control bg-muted"
            key={`term-index-skeleton-${item}`}
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-container border border-border">
        <div className="h-10 bg-muted" />
        {range(6).map((item) => (
          <div
            className="flex h-14 items-center gap-4 border-t border-border px-4"
            key={`term-row-skeleton-${item}`}
          >
            <div className="h-4 w-1/4 rounded-control bg-muted" />
            <div className="h-4 w-1/4 rounded-control bg-muted" />
            <div className="h-4 flex-1 rounded-control bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
