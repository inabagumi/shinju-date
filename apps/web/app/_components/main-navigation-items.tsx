import { SITE_NAME as siteName } from '@shinju-date/constants'
import { ContactLink } from './contact-link'
import { NavLink } from './nav-link'

interface MainNavigationItemsProps {
  linkClassName: string
}

/**
 * Primary navigation items shared between the desktop header and the mobile
 * menu. Renders `<li>` elements, so it must be placed inside a list.
 */
export function MainNavigationItems({
  linkClassName,
}: MainNavigationItemsProps) {
  return (
    <>
      <li>
        <NavLink className={linkClassName} href="/about">
          {siteName}とは
        </NavLink>
      </li>
      <li>
        <NavLink className={linkClassName} href="/videos">
          動画一覧
        </NavLink>
      </li>
      <li className="empty:hidden">
        <ContactLink className={linkClassName}>お問い合わせ</ContactLink>
      </li>
    </>
  )
}
