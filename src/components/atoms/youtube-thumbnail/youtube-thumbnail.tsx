import React, { FC } from 'react'

import styles from './youtube-thumbnail.module.css'

type Props = {
  id: string
}

const YouTubeThumbnail: FC<Props> = ({ id }) => (
  <div className={styles.thumbnail}>
    <img
      alt=""
      className={styles.image}
      height={360}
      loading="lazy"
      sizes="(min-width: 500px) 320px, 480px"
      src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
      srcSet={`https://i.ytimg.com/vi/${id}/mqdefault.jpg 320w, https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
      width={480}
    />
  </div>
)

export default YouTubeThumbnail
