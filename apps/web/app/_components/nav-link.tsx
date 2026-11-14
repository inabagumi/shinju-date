'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ComponentProps, Suspense } from 'react'

interface NavLinkProps extends Omit<ComponentProps<typeof Link>, 'href'> {
  href: string
}

function isCurrentPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function ActiveNavLink({ href, ...props }: NavLinkProps) {
  const pathname = usePathname()

  return (
    <Link
      {...props}
      aria-current={isCurrentPath(pathname, href) ? 'page' : undefined}
      href={href}
    />
  )
}

/**
 * A navigation link that marks itself with `aria-current="page"` when the
 * current pathname matches its `href` (or one of its sub paths).
 *
 * `usePathname` suspends during prerendering on routes with unknown dynamic
 * params, so the active state is resolved inside a Suspense boundary while a
 * plain link is rendered as the fallback.
 */
export function NavLink(props: NavLinkProps) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <ActiveNavLink {...props} />
    </Suspense>
  )
}
