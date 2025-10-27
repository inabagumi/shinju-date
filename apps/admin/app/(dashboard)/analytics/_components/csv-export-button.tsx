'use client'

import { exportToCSV } from '../_lib/export-csv'

type Props = {
  data: Array<Record<string, string | number>>
  filename: string
  disabled?: boolean
}

export function CSVExportButton({ data, filename, disabled = false }: Props) {
  const handleExport = () => {
    exportToCSV(data, filename)
  }

  return (
    <button
      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={handleExport}
      type="button"
    >
      CSV エクスポート
    </button>
  )
}
