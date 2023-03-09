import { type Metadata } from 'next'
import shareCard from '@/assets/share-card.jpg'
import { description } from './constants'

const baseMetadata: Metadata = {
  description,
  openGraph: {
    description,
    images: [
      {
        height: shareCard.height,
        url: shareCard.src,
        width: shareCard.width
      }
    ],
    siteName: 'SHINJU DATE'
  },
  robots: {
    follow: true,
    index: true
  },
  twitter: {
    card: 'summary_large_image'
  }
}

export default baseMetadata
