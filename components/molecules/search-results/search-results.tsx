import chunk from 'lodash/chunk'
import React, { FC, ReactElement } from 'react'
import Video from '../../../types/video'
import VideoCard from '../../atoms/video-card'

const COLUMNS_COUNT = 3

interface Props {
  values: Video[]
}

const SearchResults: FC<Props> = ({ values }): ReactElement => {
  return (
    <>
      <div className="margin-top--lg">
        {chunk(values, COLUMNS_COUNT).map(
          (row, i): ReactElement => (
            <div className="row" key={`row-${i}`}>
              {row.map(
                (value): ReactElement => (
                  <div
                    className={`col col--${12 /
                      COLUMNS_COUNT} padding-bottom--lg padding-horiz--sm`}
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
