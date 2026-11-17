import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VideoThumbnail } from './video-thumbnail'

const thumbnail = {
  blur_data_url: 'data:image/png;base64,iVBORw0KGgo=',
  id: '00000000-0000-0000-0000-000000000001',
}

describe('VideoThumbnail', () => {
  it('renders the image of the thumbnail', () => {
    render(
      <VideoThumbnail alt="動画のタイトル" size="lg" thumbnail={thumbnail} />,
    )

    const image = screen.getByRole('img', { name: '動画のタイトル' })

    expect(image.getAttribute('src')).toContain(
      encodeURIComponent(`/images/thumbnails/${thumbnail.id}`),
    )
    expect(image).toHaveAttribute('sizes', '(max-width: 1024px) 100vw, 50vw')
  })

  it.each([
    ['sm', 'w-20'],
    ['md', 'w-28'],
    ['lg', 'w-full'],
  ] as const)(
    'draws a frame of the %s size without an image',
    (size, width) => {
      render(<VideoThumbnail size={size} thumbnail={null} />)

      expect(screen.queryByRole('img')).not.toBeInTheDocument()
      expect(screen.getByText('No Image')).toHaveClass(
        'aspect-video',
        width,
        'rounded-container',
        'bg-muted',
      )
    },
  )
})
