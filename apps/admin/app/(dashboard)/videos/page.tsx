import Pagination from './_components/pagination'
import VideoList from './_components/video-list'
import { getVideos } from './_lib/get-videos'

type Props = {
  searchParams: Promise<{
    page?: string
  }>
}

export default async function VideosPage({ searchParams }: Props) {
  const params = await searchParams
  const currentPage = Number(params.page) || 1
  const perPage = 20

  const { videos, total } = await getVideos(currentPage, perPage)
  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="font-bold text-2xl">動画管理</h1>
        <p className="text-gray-600">全 {total} 件の動画</p>
      </div>

      {videos.length > 0 ? (
        <>
          <VideoList videos={videos} />
          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} />
          )}
        </>
      ) : (
        <p className="p-4 text-gray-500">動画がありません。</p>
      )}
    </div>
  )
}
