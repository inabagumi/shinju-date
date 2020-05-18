import React, { FC } from 'react'

import VideoCard from '@/components/molecules/VideoCard'

const SearchSkeleton: FC = () => (
  <div className="row">
    <div className="col col--4 padding-bottom--lg padding-horiz--sm">
      <VideoCard />
    </div>
    <div className="col col--4 padding-bottom--lg padding-horiz--sm">
      <VideoCard />
    </div>
  </div>
)

export default SearchSkeleton
