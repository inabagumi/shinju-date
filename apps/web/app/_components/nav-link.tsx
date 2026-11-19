"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import type { ComponentProps } from "react";

interface NavLinkProps extends Omit<ComponentProps<typeof Link>, "href"> {
  href: string;
}

const isCurrentPath = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

const ActiveNavLink = ({ href, ...props }: NavLinkProps) => {
  const pathname = usePathname();

  return (
    <Link
      {...props}
      aria-current={isCurrentPath(pathname, href) ? "page" : undefined}
      href={href}
    />
  );
};

/**
 * A navigation link that marks itself with `aria-current="page"` when the
 * current pathname matches its `href` (or one of its sub paths).
 *
 * `usePathname` suspends during prerendering on routes with unknown dynamic
 * params, so the active state is resolved inside a Suspense boundary while a
 * plain link is rendered as the fallback.
 */
export const NavLink = (props: NavLinkProps) => (
  <Suspense fallback={<Link {...props} />}>
    <ActiveNavLink {...props} />
  </Suspense>
);
