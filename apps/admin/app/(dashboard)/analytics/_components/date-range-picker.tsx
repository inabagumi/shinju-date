'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import { useState } from 'react'
import { Temporal } from 'temporal-polyfill'

export type DateRange = {
  startDate: string // ISO 8601 date string
  endDate: string // ISO 8601 date string
}

type DateRangePickerProps = {
  value: DateRange
  onChange: (range: DateRange) => void
  showComparison?: boolean
  onComparisonToggle?: (enabled: boolean) => void
}

export default function DateRangePicker({
  value,
  onChange,
  showComparison = false,
  onComparisonToggle,
}: DateRangePickerProps) {
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customStart, setCustomStart] = useState(value.startDate)
  const [customEnd, setCustomEnd] = useState(value.endDate)
  const [comparisonEnabled, setComparisonEnabled] = useState(false)

  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()

  const presets = [
    {
      getValue: () => ({
        endDate: today.toString(),
        startDate: today.subtract({ days: 6 }).toString(),
      }),
      label: '過去7日間',
    },
    {
      getValue: () => ({
        endDate: today.toString(),
        startDate: today.subtract({ days: 29 }).toString(),
      }),
      label: '過去30日間',
    },
    {
      getValue: () => {
        const firstDay = today.with({ day: 1 })
        return {
          endDate: today.toString(),
          startDate: firstDay.toString(),
        }
      },
      label: '今月',
    },
    {
      getValue: () => {
        const lastMonth = today.subtract({ months: 1 })
        const firstDay = lastMonth.with({ day: 1 })
        const lastDay = firstDay.add({ months: 1 }).subtract({ days: 1 })
        return {
          endDate: lastDay.toString(),
          startDate: firstDay.toString(),
        }
      },
      label: '先月',
    },
  ]

  const handlePresetClick = (preset: (typeof presets)[number]) => {
    const range = preset.getValue()
    onChange(range)
    setIsCustomMode(false)
  }

  const handleCustomApply = () => {
    onChange({
      endDate: customEnd,
      startDate: customStart,
    })
    setIsCustomMode(false)
  }

  const handleComparisonToggle = () => {
    const newValue = !comparisonEnabled
    setComparisonEnabled(newValue)
    onComparisonToggle?.(newValue)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">期間選択</h3>
        {showComparison && (
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={comparisonEnabled}
              className="rounded border-gray-300"
              onChange={handleComparisonToggle}
              type="checkbox"
            />
            <span className="text-gray-700">前期間と比較</span>
          </label>
        )}
      </div>

      {!isCustomMode ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <button
            className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
            onClick={() => setIsCustomMode(true)}
            type="button"
          >
            カスタム期間を選択
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1 block text-gray-700 text-xs"
                htmlFor="start-date"
              >
                開始日
              </label>
              <input
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                id="start-date"
                onChange={(e) => setCustomStart(e.target.value)}
                type="date"
                value={customStart}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-gray-700 text-xs"
                htmlFor="end-date"
              >
                終了日
              </label>
              <input
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                id="end-date"
                onChange={(e) => setCustomEnd(e.target.value)}
                type="date"
                value={customEnd}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
              onClick={() => setIsCustomMode(false)}
              type="button"
            >
              キャンセル
            </button>
            <button
              className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
              onClick={handleCustomApply}
              type="button"
            >
              適用
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 rounded bg-gray-50 px-3 py-2 text-gray-600 text-xs">
        現在の期間: {value.startDate} 〜 {value.endDate}
      </div>
    </div>
  )
}
