import Link from 'next/link'
import { isContactFormEnabled } from '@/app/contact/_lib/actions'

interface ContactLinkProps {
  className?: string
  children: React.ReactNode
}

export async function ContactLink({ className, children }: ContactLinkProps) {
  const enabled = await isContactFormEnabled()

  if (!enabled) {
    return null
  }

  return (
    <Link className={className} href="/contact">
      {children}
    </Link>
  )
}
