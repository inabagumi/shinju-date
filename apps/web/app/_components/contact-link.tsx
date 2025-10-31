import Link from 'next/link'
import { isContactFormEnabled } from '@/app/contact/_lib/utils'

interface ContactLinkProps {
  className?: string
  children: React.ReactNode
}

export async function ContactLink({ className, children }: ContactLinkProps) {
  const enabled = isContactFormEnabled()

  if (!enabled) {
    return null
  }

  return (
    <Link className={className} href="/contact">
      {children}
    </Link>
  )
}
