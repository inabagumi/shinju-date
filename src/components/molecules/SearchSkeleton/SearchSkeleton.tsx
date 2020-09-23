import { FC } from 'react'

import { Col, Row } from '@/components/molecules/Grid'
import VideoCard from '@/components/molecules/VideoCard'

const SearchSkeleton: FC = () => (
  <Row>
    <Col className="padding-bottom--lg padding-horiz--sm" size={4}>
      <VideoCard />
    </Col>
    <Col className="padding-bottom--lg padding-horiz--sm" size={4}>
      <VideoCard />
    </Col>
  </Row>
)

export default SearchSkeleton
