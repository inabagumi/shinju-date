import { describe, expect, it, vi } from 'vitest'
import { videoSearchParamsSchema } from './search-params-schema'

// Mock Next.js navigation hooks
const mockPush = vi.fn()
const mockUseRouter = vi.fn(() => ({ push: mockPush }))
const mockUseSearchParams = vi.fn()
const mockUsePathname = vi.fn(() => '/videos')

vi.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
  useRouter: mockUseRouter,
  useSearchParams: mockUseSearchParams,
}))

describe('Pagination URL Generation Logic', () => {
  it('should preserve all query parameters when changing page', () => {
    // Mock current search params with filters applied
    const currentParams = new URLSearchParams({
      channelId: '123',
      deleted: 'false',
      page: '2',
      search: 'test video',
      sortField: 'published_at',
      sortOrder: 'asc',
      visible: 'true',
    })

    mockUseSearchParams.mockReturnValue(currentParams)

    // Simulate creating a URL for page 3
    const newParams = new URLSearchParams(currentParams.toString())
    newParams.set('page', '3')
    const expectedUrl = `/videos?${newParams.toString()}`

    expect(expectedUrl).toContain('search=test+video')
    expect(expectedUrl).toContain('channelId=123')
    expect(expectedUrl).toContain('visible=true')
    expect(expectedUrl).toContain('deleted=false')
    expect(expectedUrl).toContain('sortField=published_at')
    expect(expectedUrl).toContain('sortOrder=asc')
    expect(expectedUrl).toContain('page=3')
  })

  it('should work with minimal parameters', () => {
    const currentParams = new URLSearchParams({ page: '1' })
    mockUseSearchParams.mockReturnValue(currentParams)

    const newParams = new URLSearchParams(currentParams.toString())
    newParams.set('page', '2')
    const expectedUrl = `/videos?${newParams.toString()}`

    expect(expectedUrl).toBe('/videos?page=2')
  })

  it('should handle complex filter combinations', () => {
    const currentParams = new URLSearchParams({
      channelId: '456',
      page: '5',
      search: 'anime music',
      sortField: 'updated_at',
      visible: 'false',
    })

    mockUseSearchParams.mockReturnValue(currentParams)

    // Test going to previous page
    const newParams = new URLSearchParams(currentParams.toString())
    newParams.set('page', '4')
    const expectedUrl = `/videos?${newParams.toString()}`

    expect(expectedUrl).toContain('search=anime+music')
    expect(expectedUrl).toContain('channelId=456')
    expect(expectedUrl).toContain('visible=false')
    expect(expectedUrl).toContain('sortField=updated_at')
    expect(expectedUrl).toContain('page=4')
    expect(expectedUrl).not.toContain('page=5')
  })
})

describe('Integration: Schema + Pagination Logic', () => {
  it('should handle URL parameters that come from actual pagination', () => {
    // This simulates what would happen when a user clicks a pagination link
    const urlParams = {
      channelId: 'dee90561-a010-48a5-88fa-cde39be9a94a',
      page: '3',
      search: 'test',
      sortField: 'published_at',
      sortOrder: 'desc',
      visible: 'true',
    }

    // Parse with our schema
    const validated = videoSearchParamsSchema.parse(urlParams)

    expect(validated).toEqual({
      channelId: 'dee90561-a010-48a5-88fa-cde39be9a94a',
      page: 3,
      search: 'test',
      sortField: 'published_at',
      sortOrder: 'desc',
      visible: true,
    })
  })
})
