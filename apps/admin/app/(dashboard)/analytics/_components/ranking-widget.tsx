import Link from 'next/link'
import type { ReactNode } from 'react'
import { ExportLink, type ExportType } from './export-link'
import { RankingTable } from './ranking-table'
import { WidgetHeader } from './widget-header'

interface RankingWidgetProps<T> {
  dateRange: { startDate: string; endDate: string }
  description: ReactNode
  /** CSV のエクスポートの種類 */
  exportType: ExportType
  /** 行の名前のリンク先。省略すると、名前をリンクにしない */
  getHref?: (row: T) => string
  getKey: (row: T) => string
  getLabel: (row: T) => ReactNode
  getValue: (row: T) => number
  /** 名前の列の見出し（「キーワード」「動画」など） */
  labelHeading: string
  rows: T[]
  selectedDate: string | null
  title: ReactNode
  /** 回数の列の見出し */
  valueHeading: string
}

/**
 * アナリティクスのランキングのウィジェット。見出し・CSV のエクスポート・ランキングの表を並べる。
 * 取得した行と、行から名前・リンク先・値を取り出す関数を受け取る。
 */
export function RankingWidget<T>({
  dateRange,
  description,
  exportType,
  getHref,
  getKey,
  getLabel,
  getValue,
  labelHeading,
  rows,
  selectedDate,
  title,
  valueHeading,
}: RankingWidgetProps<T>) {
  return (
    <div>
      <WidgetHeader
        actions={
          <ExportLink
            dateRange={dateRange}
            selectedDate={selectedDate}
            type={exportType}
          />
        }
        dateRange={dateRange}
        description={description}
        selectedDate={selectedDate}
        title={title}
      />
      <RankingTable
        items={rows.map((row) => {
          const label = getLabel(row)

          return {
            key: getKey(row),
            label: getHref ? (
              <Link className="text-accent hover:underline" href={getHref(row)}>
                {label}
              </Link>
            ) : (
              label
            ),
            value: getValue(row),
          }
        })}
        labelHeading={labelHeading}
        valueHeading={valueHeading}
      />
    </div>
  )
}
