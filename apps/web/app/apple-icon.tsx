import { ImageResponse } from 'next/og'
import SearchIcon from './_components/search-icon'

export const dynamic = 'force-static'
export const revalidate = 86_400 // 1 day
export const runtime = 'edge'

export const contentType = 'image/png'
export const size = {
  height: 180,
  width: 180
}

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: '#1e0064',
          color: '#f2f1ff',
          display: 'flex',
          height: '100%',
          width: '100%'
        }}
      >
        <SearchIcon style={{ height: '100%', width: '100%' }} />
      </div>
    ),
    {
      ...size
    }
  )
}
