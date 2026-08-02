import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THUMBNAIL_HEIGHT,
  DEFAULT_THUMBNAIL_WIDTH,
  resolveThumbnailTemplateUrl,
} from '../processing'

describe('resolveThumbnailTemplateUrl', () => {
  it('replaces %{width} and %{height} placeholders', () => {
    expect(
      resolveThumbnailTemplateUrl(
        'https://static-cdn.jtvnw.net/cf_vods/example-%{width}x%{height}.jpg',
        1280,
        720,
      ),
    ).toBe('https://static-cdn.jtvnw.net/cf_vods/example-1280x720.jpg')
  })

  it('replaces {width} and {height} placeholders', () => {
    expect(
      resolveThumbnailTemplateUrl(
        'https://static-cdn.jtvnw.net/cf_vods/example-{width}x{height}.jpg',
        640,
        360,
      ),
    ).toBe('https://static-cdn.jtvnw.net/cf_vods/example-640x360.jpg')
  })

  it('uses default dimensions when none are provided', () => {
    expect(
      resolveThumbnailTemplateUrl(
        'https://static-cdn.jtvnw.net/cf_vods/example-%{width}x%{height}.jpg',
      ),
    ).toBe(
      `https://static-cdn.jtvnw.net/cf_vods/example-${DEFAULT_THUMBNAIL_WIDTH}x${DEFAULT_THUMBNAIL_HEIGHT}.jpg`,
    )
  })

  it('returns unchanged URL when no placeholders exist', () => {
    const url = 'https://example.com/thumb.jpg'
    expect(resolveThumbnailTemplateUrl(url)).toBe(url)
  })
})
