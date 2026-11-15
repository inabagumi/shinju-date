import { CalendarPlus, ExternalLink } from 'lucide-react'
import PageHeader from '@/components/page-header'
import TalentIcon from '@/components/talent-icon'
import type { TalentDetail } from '@/lib/fetchers'
import { getTalentLinks, type TalentLink } from '@/lib/talent-links'
import { getShownTalent, type TalentPageParams } from '../_lib/get-shown-talent'

const LINK_CLASS_NAME =
  'inline-flex items-center gap-1 rounded-control font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

interface TalentLinkItemProps {
  link: TalentLink
}

function TalentLinkItem({ link }: TalentLinkItemProps) {
  if (link.external) {
    return (
      <a
        className={LINK_CLASS_NAME}
        href={link.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {link.label}
        <ExternalLink aria-hidden="true" className="size-4" />
      </a>
    )
  }

  // The calendar is not a page, so it is not a `next/link` link
  return (
    <a className={LINK_CLASS_NAME} href={link.href}>
      <CalendarPlus aria-hidden="true" className="size-4" />
      {link.label}
    </a>
  )
}

interface TalentPageHeaderProps {
  talent: TalentDetail
}

/**
 * The heading of a talent's page: the icon and the name, with the links to
 * the talent's channels and calendar where the description goes.
 */
export function TalentPageHeader({ talent }: TalentPageHeaderProps) {
  return (
    <PageHeader
      breadcrumbs={[{ name: talent.name }]}
      description={
        <nav aria-label="リンク">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-meta">
            {getTalentLinks(talent).map((link) => (
              <li key={link.href}>
                <TalentLinkItem link={link} />
              </li>
            ))}
          </ul>
        </nav>
      }
      title={
        <span className="flex items-center gap-4">
          <TalentIcon size={64} talent={talent} />
          <span className="min-w-0 break-words">{talent.name}</span>
        </span>
      }
    />
  )
}

interface TalentPageHeadingProps {
  params: TalentPageParams
}

export async function TalentPageHeading({ params }: TalentPageHeadingProps) {
  const talent = await getShownTalent(params)

  return <TalentPageHeader talent={talent} />
}

export function TalentPageHeadingSkeleton() {
  return (
    <div aria-hidden="true" className="mb-8 space-y-2">
      <div className="h-[1.4rem] w-48 animate-pulse rounded-control bg-muted" />
      <div className="flex items-center gap-4">
        <div className="size-16 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="h-[2.1rem] w-64 animate-pulse rounded-control bg-muted md:h-[2.8rem]" />
      </div>
      <div className="h-[1lh] w-80 max-w-full animate-pulse rounded-control bg-muted text-meta" />
    </div>
  )
}
