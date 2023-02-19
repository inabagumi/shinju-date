import { type Metadata } from 'next'
import shareCard from '@/assets/share-card.jpg'

const description = process.env.NEXT_PUBLIC_DESCRIPTION

const baseMetadata: Metadata = {
  description,
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL),
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
