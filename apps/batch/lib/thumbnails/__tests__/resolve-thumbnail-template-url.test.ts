import { describe, expect, it } from 'vitest'
import { resolveThumbnailTemplateUrl } from '../processing'

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

  it('returns unchanged URL when no placeholders exist', () => {
    const url = 'https://example.com/thumb.jpg'
    expect(resolveThumbnailTemplateUrl(url)).toBe(url)
  })
})
