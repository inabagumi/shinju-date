import { ImageResponse } from 'next/og'

export const revalidate = 86_400 // 1 day

const ICON_IMAGE_SIZE_LIST: Record<
  string,
  {
    height: number
    width: number
  }
> = {
  large: {
    height: 512,
    width: 512,
  },
  medium: {
    height: 192,
    width: 192,
  },
} as const

export function generateImageMetadata() {
  return ['medium', 'large'].map((id) => ({
    contentType: 'image/png',
    id,
    size: ICON_IMAGE_SIZE_LIST[id],
  }))
}

export default function Icon({ id }: { id: string }) {
  return new ImageResponse(
    <div
      style={{
        backgroundColor: '#1e0064',
        borderRadius: '10%',
        color: '#f2f1ff',
        display: 'flex',
        height: '100%',
        width: '100%',
      }}
    >
      <svg
        aria-hidden="true"
        style={{
          height: '100%',
          width: '100%',
        }}
        viewBox="0 0 24 24"
      >
        <circle
          cx="11"
          cy="11"
          fill="transparent"
          r="8"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="m21 21-4.3-4.3"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </div>,
    {
      ...ICON_IMAGE_SIZE_LIST[id],
    },
  )
}
