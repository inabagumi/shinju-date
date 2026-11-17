import { fireEvent, render } from '@testing-library/react'
import type { ComponentType } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { SEARCH_EXIT_ENDPOINT } from '@/lib/search-exit'

const mocks = vi.hoisted(() => ({
  pathname: '/',
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

interface TrackerProps {
  hasResults: boolean
  query: string
}

interface PageProps {
  /** 検索の結果のページなら、そのときの `SearchExitTracker` の Props */
  tracker?: TrackerProps
}

let SearchExitObserver: ComponentType
let SearchExitTracker: ComponentType<TrackerProps>
let sendBeacon: ReturnType<typeof vi.fn<(url: string, data: string) => boolean>>

/** ルートレイアウトの `SearchExitObserver` と、ページの `SearchExitTracker` */
function Page({ tracker }: PageProps) {
  return (
    <>
      <SearchExitObserver />
      {tracker && <SearchExitTracker {...tracker} />}
      <a href="#video" ping="/api/ping">
        <span>動画</span>
      </a>
      <a href="#about">このサイトについて</a>
    </>
  )
}

/** `pathname` へ移動して、そのページを描き直す */
function navigate(
  rerender: (ui: React.ReactNode) => void,
  pathname: string,
  props: PageProps = {},
) {
  mocks.pathname = pathname
  rerender(<Page {...props} />)
}

function getSentQueries(): string[] {
  return sendBeacon.mock.calls.map(([url, data]) => {
    expect(url).toBe(SEARCH_EXIT_ENDPOINT)

    return (JSON.parse(data) as { query: string }).query
  })
}

function setVisibilityState(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('search exit tracking', () => {
  beforeEach(async () => {
    // 状態はタブに1つだけ持つので、テストごとに読み込み直す
    vi.resetModules()
    SearchExitObserver = (await import('../search-exit-observer')).default
    SearchExitTracker = (await import('../search-exit-tracker')).default

    sendBeacon = vi.fn(() => true)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon,
    })
    mocks.pathname = '/videos/%E6%AD%8C'
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'sendBeacon')
    Reflect.deleteProperty(document, 'visibilityState')
    vi.unstubAllGlobals()
  })

  test('records an exit once when moving to another page', () => {
    const { rerender } = render(
      <Page tracker={{ hasResults: true, query: '歌' }} />,
    )

    expect(sendBeacon).not.toHaveBeenCalled()

    // `<Link>` でも `router.push` でも、パスが変わる
    navigate(rerender, '/about')

    expect(getSentQueries()).toEqual(['歌'])

    navigate(rerender, '/talents')

    expect(sendBeacon).toHaveBeenCalledOnce()
  })

  test('records an exit when searching for another query', () => {
    const { rerender } = render(
      <Page tracker={{ hasResults: true, query: '歌' }} />,
    )

    navigate(rerender, '/videos/%E3%82%B2%E3%83%BC%E3%83%A0', {
      tracker: { hasResults: true, query: 'ゲーム' },
    })

    expect(getSentQueries()).toEqual(['歌'])

    navigate(rerender, '/')

    expect(getSentQueries()).toEqual(['歌', 'ゲーム'])
  })

  test('records an exit when the next search has no results', () => {
    const { rerender } = render(
      <Page tracker={{ hasResults: true, query: '歌' }} />,
    )

    navigate(rerender, '/videos/zzz', {
      tracker: { hasResults: false, query: 'zzz' },
    })

    expect(getSentQueries()).toEqual(['歌'])
  })

  test('does not record an exit when changing the filters of the same search', () => {
    const { rerender } = render(
      <Page tracker={{ hasResults: true, query: '歌' }} />,
    )

    // タレントで絞り込むと、`SearchExitTracker` は描かれない
    navigate(rerender, '/videos/%E6%AD%8C')
    navigate(rerender, '/videos/%E6%AD%8C', {
      tracker: { hasResults: true, query: '歌' },
    })

    expect(sendBeacon).not.toHaveBeenCalled()

    navigate(rerender, '/')

    expect(getSentQueries()).toEqual(['歌'])
  })

  test('does not record an exit after opening a video', () => {
    const { getByText, rerender } = render(
      <Page tracker={{ hasResults: true, query: '歌' }} />,
    )

    fireEvent.click(getByText('動画'))
    setVisibilityState('hidden')
    navigate(rerender, '/about')

    expect(sendBeacon).not.toHaveBeenCalled()
  })

  test('does not record an exit after opening a video in a new tab with the middle button', () => {
    const { getByText, rerender } = render(
      <Page tracker={{ hasResults: true, query: '歌' }} />,
    )

    fireEvent(getByText('動画'), new MouseEvent('auxclick', { bubbles: true }))
    navigate(rerender, '/about')

    expect(sendBeacon).not.toHaveBeenCalled()
  })

  test('does not treat a click on another link as opening a video', () => {
    const { getByText, rerender } = render(
      <Page tracker={{ hasResults: true, query: '歌' }} />,
    )

    fireEvent.click(getByText('このサイトについて'))
    navigate(rerender, '/about')

    expect(getSentQueries()).toEqual(['歌'])
  })

  test('does not record an exit for a search without results', () => {
    const { rerender } = render(
      <Page tracker={{ hasResults: false, query: '歌' }} />,
    )

    setVisibilityState('hidden')
    navigate(rerender, '/about')

    expect(sendBeacon).not.toHaveBeenCalled()
  })

  test('does not record an exit outside of a search', () => {
    const { rerender } = render(<Page />)

    navigate(rerender, '/about')
    setVisibilityState('hidden')

    expect(sendBeacon).not.toHaveBeenCalled()
  })

  test('sends a beacon only once when the page is hidden and closed', () => {
    const { rerender } = render(
      <Page tracker={{ hasResults: true, query: '歌' }} />,
    )

    setVisibilityState('hidden')
    window.dispatchEvent(new Event('pagehide'))
    setVisibilityState('visible')
    setVisibilityState('hidden')
    navigate(rerender, '/about')

    expect(getSentQueries()).toEqual(['歌'])
  })

  test('does not send a beacon when the page becomes visible', () => {
    render(<Page tracker={{ hasResults: true, query: '歌' }} />)

    setVisibilityState('visible')

    expect(sendBeacon).not.toHaveBeenCalled()
  })

  test('sends a beacon when the page is closed', () => {
    render(<Page tracker={{ hasResults: true, query: '歌' }} />)

    window.dispatchEvent(new Event('pagehide'))

    expect(getSentQueries()).toEqual(['歌'])
  })

  test('falls back to fetch with keepalive without sendBeacon', () => {
    Reflect.deleteProperty(navigator, 'sendBeacon')
    const fetch = vi.fn(() => Promise.resolve(new Response(null)))
    vi.stubGlobal('fetch', fetch)

    render(<Page tracker={{ hasResults: true, query: '歌' }} />)
    window.dispatchEvent(new Event('pagehide'))

    expect(fetch).toHaveBeenCalledExactlyOnceWith(SEARCH_EXIT_ENDPOINT, {
      body: JSON.stringify({ query: '歌' }),
      keepalive: true,
      method: 'POST',
    })
  })

  test('falls back to fetch with keepalive when sendBeacon cannot queue the data', () => {
    sendBeacon.mockReturnValue(false)
    const fetch = vi.fn(() => Promise.resolve(new Response(null)))
    vi.stubGlobal('fetch', fetch)

    render(<Page tracker={{ hasResults: true, query: '歌' }} />)
    window.dispatchEvent(new Event('pagehide'))

    expect(sendBeacon).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledOnce()
  })
})
