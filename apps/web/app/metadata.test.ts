import { beforeEach, describe, expect, test, vi } from 'vitest'
import { SITE_DESCRIPTION, SITE_TAGLINE } from '@/lib/site'

// Vite imports an image as its URL, which Next.js imports as its data
vi.mock('@/app/opengraph-image.jpg', () => ({
  default: {
    height: 630,
    src: '/_next/static/media/opengraph-image.0123456789abc.jpg',
    width: 1200,
  },
}))

vi.mock('@/lib/data/schedule', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/data/schedule')>()),
  fetchOldestVideoDate: vi.fn(),
  fetchScheduleToday: vi.fn(),
}))

vi.mock('@/lib/data/talents', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/data/talents')>()),
  fetchActiveTalents: vi.fn(),
  fetchTalent: vi.fn(),
}))

import { fetchOldestVideoDate, fetchScheduleToday } from '@/lib/data/schedule'
import { fetchActiveTalents, fetchTalent } from '@/lib/data/talents'
import { metadata as aboutMetadata } from './about/layout'
import { metadata as contactMetadata } from './contact/page'
import { metadata as feedbackMetadata } from './feedback/page'
import { metadata as homeMetadata } from './page'
import { metadata as privacyMetadata } from './privacy/layout'
import { generateMetadata as generateScheduleWeekMetadata } from './schedule/[date]/page'
import { metadata as scheduleMetadata } from './schedule/page'
import { generateMetadata as generateTalentMetadata } from './talents/[id]/page'
import { metadata as talentsMetadata } from './talents/page'
import { metadata as termsMetadata } from './terms/layout'
import { generateMetadata as generateVideosMetadata } from './videos/[[...queries]]/page'

const TALENT_ID = '00000000-0000-4000-8000-000000000001'

/** The image of the site, which the pages without their own image have. */
const SITE_IMAGES = [
  {
    height: 630,
    type: 'image/jpeg',
    url: '/_next/static/media/opengraph-image.0123456789abc.jpg',
    width: 1200,
  },
]

function generateVideosPageMetadata(
  queries: string[] | undefined,
  searchParams: Record<string, string | string[]> = {},
) {
  return generateVideosMetadata({
    params: Promise.resolve(queries ? { queries } : {}),
    searchParams: Promise.resolve(searchParams),
  })
}

/**
 * The metadata of every page, written out in full. The pages build it with
 * `createPageMetadata`, so a change to that function shows up here as a change
 * to the pages.
 */
describe('metadata of the pages', () => {
  beforeEach(() => {
    vi.mocked(fetchActiveTalents).mockResolvedValue([
      { id: TALENT_ID, name: '朝霧ミオ' },
    ])
    vi.mocked(fetchOldestVideoDate).mockResolvedValue('2020-01-01')
    vi.mocked(fetchScheduleToday).mockResolvedValue('2026-11-10')
  })

  test('home page', () => {
    expect(homeMetadata).toStrictEqual({
      alternates: {
        canonical: '/',
      },
      description: SITE_DESCRIPTION,
      openGraph: {
        description: SITE_DESCRIPTION,
        images: SITE_IMAGES,
        title: 'SHINJU DATE',
        type: 'website',
        url: '/',
      },
      title: {
        absolute: `SHINJU DATE - ${SITE_TAGLINE}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: 'SHINJU DATE',
      },
    })
  })

  test.each([
    {
      metadata: aboutMetadata,
      name: 'about',
      path: '/about',
      title: 'SHINJU DATEとは?',
      type: 'article',
    },
    {
      metadata: privacyMetadata,
      name: 'privacy policy',
      path: '/privacy',
      title: 'プライバシーポリシー',
      type: 'article',
    },
    {
      metadata: termsMetadata,
      name: 'terms of use',
      path: '/terms',
      title: '利用規約',
      type: 'article',
    },
    {
      metadata: scheduleMetadata,
      name: 'schedule of the current week',
      path: '/schedule',
      title: '配信スケジュール',
      type: 'article',
    },
    {
      metadata: talentsMetadata,
      name: 'list of talents',
      path: '/talents',
      title: 'タレント一覧',
      type: 'website',
    },
  ])('$name page', ({ metadata, path, title, type }) => {
    expect(metadata).toStrictEqual({
      alternates: {
        canonical: path,
      },
      openGraph: {
        images: SITE_IMAGES,
        siteName: 'SHINJU DATE',
        title,
        type,
        url: path,
      },
      title,
      twitter: {
        card: 'summary_large_image',
        title: `${title} - SHINJU DATE`,
      },
    })
  })

  test('schedule page of a week, which is not indexed', async () => {
    const metadata = await generateScheduleWeekMetadata({
      // A Tuesday. The canonical URL is that of the Sunday of the week.
      params: Promise.resolve({ date: '2026-11-10' }),
    })

    expect(metadata).toStrictEqual({
      alternates: {
        canonical: '/schedule/2026-11-08',
      },
      openGraph: {
        images: SITE_IMAGES,
        siteName: 'SHINJU DATE',
        title: '2026年11月8日〜11月14日の配信スケジュール',
        type: 'article',
        url: '/schedule/2026-11-08',
      },
      robots: {
        index: false,
      },
      title: '2026年11月8日〜11月14日の配信スケジュール',
      twitter: {
        card: 'summary_large_image',
        title: '2026年11月8日〜11月14日の配信スケジュール - SHINJU DATE',
      },
    })
  })

  test('talent page', async () => {
    vi.mocked(fetchTalent).mockResolvedValue({
      id: TALENT_ID,
      name: '朝霧ミオ',
    } as Awaited<ReturnType<typeof fetchTalent>>)

    const metadata = await generateTalentMetadata({
      params: Promise.resolve({ id: TALENT_ID }),
    })

    expect(metadata).toStrictEqual({
      alternates: {
        canonical: `/talents/${TALENT_ID}`,
        types: {
          'text/calendar': `/talents/${TALENT_ID}.ics`,
        },
      },
      openGraph: {
        siteName: 'SHINJU DATE',
        title: '朝霧ミオ',
        type: 'profile',
        url: `/talents/${TALENT_ID}`,
      },
      title: '朝霧ミオ',
      twitter: {
        card: 'summary_large_image',
        title: '朝霧ミオ - SHINJU DATE',
      },
    })
  })

  test('list of videos', async () => {
    const metadata = await generateVideosPageMetadata(undefined, {
      kind: 'short',
    })

    expect(metadata).toStrictEqual({
      alternates: {
        canonical: '/videos',
        types: {
          'text/calendar': '/videos.ics?kind=short',
        },
      },
      openGraph: {
        images: SITE_IMAGES,
        siteName: 'SHINJU DATE',
        title: '動画一覧',
        type: 'article',
        url: '/videos',
      },
      robots: {
        index: true,
      },
      title: '動画一覧',
      twitter: {
        card: 'summary_large_image',
        title: '動画一覧 - SHINJU DATE',
      },
    })
  })

  test('search results, which are not indexed and have no calendar', async () => {
    const metadata = await generateVideosPageMetadata(['マイクラ'])

    expect(metadata).toStrictEqual({
      alternates: {
        canonical: `/videos/${encodeURIComponent('マイクラ')}`,
        types: {
          'text/calendar': null,
        },
      },
      openGraph: {
        images: SITE_IMAGES,
        siteName: 'SHINJU DATE',
        title: '『マイクラ』の検索結果',
        type: 'article',
        url: `/videos/${encodeURIComponent('マイクラ')}`,
      },
      robots: {
        index: false,
      },
      title: '『マイクラ』の検索結果',
      twitter: {
        card: 'summary_large_image',
        title: '『マイクラ』の検索結果 - SHINJU DATE',
      },
    })
  })

  test('list of videos of a talent, which is not indexed', async () => {
    const metadata = await generateVideosPageMetadata(undefined, {
      talent: TALENT_ID,
    })

    expect(metadata.alternates).toStrictEqual({
      canonical: '/videos',
      types: {
        'text/calendar': `/videos.ics?talent=${TALENT_ID}`,
      },
    })
    expect(metadata.robots).toStrictEqual({ index: false })
  })

  test('contact page', () => {
    expect(contactMetadata).toStrictEqual({
      alternates: {
        canonical: '/contact',
      },
      description:
        'SHINJU DATEに関するお問い合わせフォームです。不具合報告や機能要望をお寄せください。',
      openGraph: {
        description:
          'SHINJU DATEに関するお問い合わせフォームです。不具合報告や機能要望をお寄せください。',
        images: SITE_IMAGES,
        siteName: 'SHINJU DATE',
        title: 'お問い合わせ',
        type: 'website',
        url: '/contact',
      },
      title: 'お問い合わせ',
      twitter: {
        card: 'summary_large_image',
        title: 'お問い合わせ - SHINJU DATE',
      },
    })
  })

  test('feedback page', () => {
    expect(feedbackMetadata).toStrictEqual({
      alternates: {
        canonical: '/feedback',
      },
      description:
        'SHINJU DATEへの機能要望を送信できます。こんな機能があったらいいな、というアイデアをお寄せください。',
      openGraph: {
        description:
          'SHINJU DATEへの機能要望を送信できます。こんな機能があったらいいな、というアイデアをお寄せください。',
        images: SITE_IMAGES,
        siteName: 'SHINJU DATE',
        title: '機能要望',
        type: 'website',
        url: '/feedback',
      },
      title: '機能要望',
      twitter: {
        card: 'summary_large_image',
        title: '機能要望 - SHINJU DATE',
      },
    })
  })
})
