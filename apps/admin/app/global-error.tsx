'use client'

import NextError from 'next/error'
import { useEffect } from 'react'
import { captureException } from '@/lib/sentry'

export default function GlobalError({
  error
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  )
}
