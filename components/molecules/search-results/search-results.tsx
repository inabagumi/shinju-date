import chunk from 'lodash/chunk'
import React, { FC, ReactElement } from 'react'
import Video from '../../../types/video'
import VideoCard from '../../atoms/video-card'

interface Props {
  values: Video[]
}

const SearchResults: FC<Props> = ({ values }): ReactElement => {
  return (
    <>
      <div className="container margin-top--lg">
        {chunk(values, 4).map(
          (row, i): ReactElement => (
            <div className="row" key={`row-${i}`}>
              {row.map(
                (value): ReactElement => (
                  <div
                    className="col padding-bottom--md padding-horiz--sm"
                    key={value.url}
                  >
                    <VideoCard value={value} />
                  </div>
                )
              )}
            </div>
          )
        )}
      </div>
    </>
  )
}

export default SearchResults
