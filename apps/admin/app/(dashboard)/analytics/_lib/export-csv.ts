export function exportToCSV(
  data: Array<Record<string, string | number>>,
  filename: string,
) {
  if (data.length === 0) {
    return
  }

  // Get headers from first row
  const firstRow = data[0]
  if (!firstRow) return

  const headers = Object.keys(firstRow)
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          // Escape values containing commas or quotes
          if (
            typeof value === 'string' &&
            (value.includes(',') || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(','),
    ),
  ].join('\n')

  // Create blob and download
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
