import { FC } from 'react'
import Video from '../../../types/video'
import VideoCard from '../../atoms/video-card'

type Props = {
  values: Video[]
}

const SearchResults: FC<Props> = ({ values }) => {
  return (
    <>
      <style jsx>{`
        .results {
          box-sizing: border-box;
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          margin: 1rem auto;
          max-width: 1200px;
          padding: 0 0.5rem;
        }
      `}</style>

      <div className="results">
        {values.map(video => (
          <VideoCard key={video.id} value={video} />
        ))}
      </div>
    </>
  )
}

export default SearchResults
