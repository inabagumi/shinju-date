interface SortIconProps {
  field: 'published_at' | 'updated_at'
  currentSortField: string
  currentSortOrder: 'asc' | 'desc'
}

export function SortIcon({
  field,
  currentSortField,
  currentSortOrder,
}: SortIconProps) {
  if (currentSortField !== field) {
    return (
      <svg
        aria-hidden="true"
        className="ml-1 inline-block h-4 w-4 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <title>並び替え可能</title>
        <path
          d="M7 10l5 5 5-5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </svg>
    )
  }
  if (currentSortOrder === 'asc') {
    return (
      <svg
        aria-hidden="true"
        className="ml-1 inline-block h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <title>昇順</title>
        <path
          d="M7 14l5-5 5 5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </svg>
    )
  }
  return (
    <svg
      aria-hidden="true"
      className="ml-1 inline-block h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <title>降順</title>
      <path
        d="M7 10l5 5 5-5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  )
}
