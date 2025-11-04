import { ImageResponse } from 'next/og'

export const revalidate = 86_400 // 1 day

export const contentType = 'image/png'
export const size = {
  height: 180,
  width: 180,
}

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        backgroundColor: '#1e0064',
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
      ...size,
    },
  )
}
