import NoResults from '@/components/no-results'
import Timeline from '@/components/timeline'
import { description, tagline, title } from '@/lib/constants'
import { fetchNotEndedVideos } from '@/lib/fetchers'

export const runtime = 'edge'
export const revalidate = 60

export const metadata = {
  alternates: {
    canonical: '/'
  },
  description,
  openGraph: {
    description,
    title,
    type: 'website',
    url: '/'
  },
  title: {
    absolute: `${title} - ${tagline}`
  },
  twitter: {
    card: 'summary_large_image',
    title
  }
}

export default async function Page(): Promise<JSX.Element> {
  const videos = await fetchNotEndedVideos({})

  if (videos.length < 1) {
    return (
      <NoResults message="YouTubeに登録されている配信予定の動画がありません。" />
    )
  }

  return <Timeline prefetchedData={videos} />
}
