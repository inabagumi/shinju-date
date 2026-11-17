import { formatNumber } from '@shinju-date/helpers'
import { Skeleton, StatTile } from '@shinju-date/ui'
import { StatTileSkeleton } from '@/components/stat-tile-skeleton'
import type { ChartSeries } from '../../_lib/chart-series'
import { formatDateLabel } from '../_lib/format-date'
import type { AnalyticsSearchParams } from '../_lib/search-params-schema'
import { getClickVolume } from '../click/_lib/get-click-volume'
import { getSearchVolume } from '../search/_lib/get-search-volume'
import {
  type VolumeChartDatum,
  VolumeChartUI,
  type VolumeChartVariant,
} from './volume-chart-ui'

interface VolumeChartKindDefinition {
  /**
   * 期間（`YYYY-MM-DD`）の日ごとの件数を取る
   *
   * 取得関数の行の型は `interface` で、インデックスシグネチャを持たないため、
   * `({ ...day })` と写してオブジェクトリテラルの型にしてから返す
   */
  fetchData: (startDate: string, endDate: string) => Promise<VolumeChartDatum[]>
  series: ChartSeries[]
  /** 合計を出す系列のキーと、その見出し */
  total: {
    key: string
    label: string
  }
  variant: VolumeChartVariant
}

/**
 * グラフの種類ごとの違い（取得関数、見出し、系列の定義）
 */
const VOLUME_CHART_KINDS = {
  click: {
    fetchData: async (startDate, endDate) => {
      const data = await getClickVolume(startDate, endDate)
      return data.map((day) => ({ ...day }))
    },
    series: [{ className: 'text-accent', key: 'clicks', label: 'クリック数' }],
    total: { key: 'clicks', label: '総クリック数' },
    variant: 'bar',
  },
  search: {
    fetchData: async (startDate, endDate) => {
      const data = await getSearchVolume(startDate, endDate)
      return data.map((day) => ({ ...day }))
    },
    series: [{ className: 'text-accent', key: 'count', label: '検索数' }],
    total: { key: 'count', label: '総検索数' },
    variant: 'area',
  },
} satisfies Record<string, VolumeChartKindDefinition>

export type VolumeChartKind = keyof typeof VOLUME_CHART_KINDS

interface VolumeChartProps {
  kind: VolumeChartKind
  searchParams: Promise<AnalyticsSearchParams>
}

function sumBy(data: VolumeChartDatum[], key: string): number {
  return data.reduce((sum, day) => {
    const value = day[key]
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)
}

/**
 * 日ごとの件数（クリック数・検索数）の合計とグラフを表示する
 */
export async function VolumeChart({ kind, searchParams }: VolumeChartProps) {
  const definition: VolumeChartKindDefinition = VOLUME_CHART_KINDS[kind]
  const { dateRange, selectedDate } = await searchParams

  const data = await definition.fetchData(
    dateRange.startDate,
    dateRange.endDate,
  )

  return (
    <>
      <StatTile
        className="mb-4 sm:max-w-xs"
        label={definition.total.label}
        value={formatNumber(sumBy(data, definition.total.key))}
      />
      <VolumeChartUI
        data={data}
        series={definition.series}
        variant={definition.variant}
      />
      {selectedDate && (
        <p className="mt-2 text-center text-meta text-muted">
          選択された日付: {formatDateLabel(selectedDate)}
        </p>
      )}
    </>
  )
}

/** 読み込み中の `VolumeChart`。合計のタイルと、グラフ（`VolumeChartUI`）と同じ高さの枠を並べる */
export function VolumeChartSkeleton() {
  return (
    <div aria-hidden="true">
      <StatTileSkeleton className="mb-4 sm:max-w-xs" />
      <Skeleton className="h-64 w-full rounded-container" />
    </div>
  )
}
