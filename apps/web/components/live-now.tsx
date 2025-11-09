import type { Tables } from '@shinju-date/database'
import React from 'react'

export default function LiveNow({
  className,
  status,
}: {
  className?: string | undefined
  status: Tables<'videos'>['status']
}) {
  if (status !== 'LIVE') {
    return null
  }

  return <span className={className}>ライブ配信中</span>
}
