import { ImageResponse } from 'next/og'
import SearchIcon from './_components/search-icon'

export const dynamic = 'force-static'
export const revalidate = 86_400 // 1 day
export const runtime = 'edge'

const ICON_IMAGE_SIZE_LIST: Record<string, { height: number; width: number }> =
  {
    large: {
      height: 512,
      width: 512
    },
    medium: {
      height: 192,
      width: 192
    }
  } as const

export function generateImageMetadata() {
  return ['medium', 'large'].map((id) => ({
    contentType: 'image/png',
    id,
    size: ICON_IMAGE_SIZE_LIST[id]
  }))
}

export default function Icon({ id }: { id: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: '#1e0064',
          borderRadius: '10%',
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
      ...ICON_IMAGE_SIZE_LIST[id]
    }
  )
}
