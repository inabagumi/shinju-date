import { FC } from 'react'
import Video from '../types/video'
import VideoCard from './video-card'

type Props = {
  values: Video[]
}

const SearchResults: FC<Props> = ({ values }) => {
  return (
    <>
      <style jsx>{`
        .results {
          margin: 1rem auto;
        }

        @media (min-width: 500px) {
          .results {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 800px) {
          grid-template-columns: repeat(4, 1fr);
          max-width: 1024px;
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
