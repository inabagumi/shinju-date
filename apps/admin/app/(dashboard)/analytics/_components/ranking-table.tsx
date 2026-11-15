import {
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shinju-date/ui'
import type { ReactNode } from 'react'

export interface RankingItem {
  key: string
  label: ReactNode
  value: number
}

interface RankingTableProps {
  items: RankingItem[]
  /** 名前の列の見出し（「キーワード」「動画」など） */
  labelHeading: string
  /** 回数の列の見出し */
  valueHeading?: string
}

/** 順位・名前・回数を並べるランキングの表 */
export function RankingTable({
  items,
  labelHeading,
  valueHeading = '回数',
}: RankingTableProps) {
  if (items.length === 0) {
    return <EmptyState title="データがありません" />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16 text-right">順位</TableHead>
          <TableHead>{labelHeading}</TableHead>
          <TableHead className="w-24 text-right">{valueHeading}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={item.key}>
            <TableCell className="text-right text-muted tabular-nums">
              {index + 1}
            </TableCell>
            <TableCell className="min-w-48 wrap-break-word whitespace-normal">
              {item.label}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {item.value.toLocaleString('ja-JP')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
