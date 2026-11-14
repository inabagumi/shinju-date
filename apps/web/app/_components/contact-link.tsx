import { isContactFormEnabled } from '@/app/contact/_lib/utils'
import { NavLink } from './nav-link'

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
    <NavLink className={className} href="/contact">
      {children}
    </NavLink>
  )
}
