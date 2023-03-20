import merge from 'lodash.merge'
import baseMetadata from '@/app/metadata'
import { fetchNotEndedVideos } from '@/lib/fetchers'
import NoResults from '@/ui/no-results'
import Timeline from '@/ui/timeline'

const title = 'SHINJU DATE'
const tagline =
  'ななしいんく所属タレントの配信スケジュールや動画の検索ができるウェブサービス'

// export const runtime = 'edge'
export const revalidate = 60

export const metadata = merge(baseMetadata, {
  alternates: {
    canonical: '/'
  },
  openGraph: {
    siteName: undefined,
    title,
    type: 'website'
  },
  title: {
    absolute: `${title} - ${tagline}`
  },
  twitter: {
    title
  }
})

export default async function Page(): Promise<JSX.Element> {
  const videos = await fetchNotEndedVideos({})

  if (videos.length < 1) {
    return (
      <NoResults message="YouTubeに登録されている配信予定の動画がありません。" />
    )
  }

  return <Timeline prefetchedData={videos} />
}
