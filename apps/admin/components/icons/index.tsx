type ChevronLeftIconProps = {
  className?: string
}

export function ChevronLeftIcon({
  className = 'h-4 w-4',
}: ChevronLeftIconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <title>戻る</title>
      <path
        d="M15 19l-7-7 7-7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  )
}

type ExternalLinkIconProps = {
  className?: string
}

export function ExternalLinkIcon({
  className = 'h-4 w-4',
}: ExternalLinkIconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <title>外部リンク</title>
      <path
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  )
}

type SpinnerIconProps = {
  className?: string
}

export function SpinnerIcon({
  className = 'h-4 w-4 animate-spin',
}: SpinnerIconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <title>読み込み中</title>
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        fill="currentColor"
      />
    </svg>
  )
}
