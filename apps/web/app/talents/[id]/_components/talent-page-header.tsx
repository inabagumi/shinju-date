import { twMerge } from '@shinju-date/ui'
import { CalendarPlus, ExternalLink } from 'lucide-react'
import LiveBadge from '@/components/live-badge'
import PageHeader from '@/components/page-header'
import TalentIcon from '@/components/talent-icon'
import {
  LIVE_RING_CLASS_NAME,
  NextStream,
} from '@/components/talent-stream-status'
import { TEXT_LINK_CLASS_NAME } from '@/lib/class-names'
import {
  fetchTalentStreamStatusesSafe,
  type TalentDetail,
  type TalentStreamStatus,
} from '@/lib/fetchers'
import { getTalentLinks, type TalentLink } from '@/lib/talent-links'
import { getShownTalent, type TalentPageParams } from '../_lib/get-shown-talent'

interface TalentLinkItemProps {
  link: TalentLink
}

function TalentLinkItem({ link }: TalentLinkItemProps) {
  if (link.external) {
    return (
      <a
        className={TEXT_LINK_CLASS_NAME}
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
    <a className={TEXT_LINK_CLASS_NAME} href={link.href}>
      <CalendarPlus aria-hidden="true" className="size-4" />
      {link.label}
    </a>
  )
}

interface StreamStatusLineProps {
  streamStatus?: TalentStreamStatus | undefined
}

/**
 * The line above the links: the live badge while the talent is live, or the
 * start of the stream within a week. Nothing is rendered without either, so
 * no space is left for it. It is only shown, not linked to the stream, which
 * the videos below link to.
 */
function StreamStatusLine({ streamStatus }: StreamStatusLineProps) {
  if (streamStatus?.isLive) {
    return (
      <p className="mb-2">
        <LiveBadge />
      </p>
    )
  }

  if (streamStatus?.nextStreamAt) {
    return (
      <p className="mb-2">
        <NextStream
          className="text-meta text-muted"
          startsAt={streamStatus.nextStreamAt}
        />
      </p>
    )
  }

  return null
}

interface TalentPageHeaderProps {
  /** Whether the talent is live and when it streams next, if known */
  streamStatus?: TalentStreamStatus | undefined
  talent: TalentDetail
}

/**
 * The heading of a talent's page: the icon and the name, with the links to
 * the talent's channels and calendar where the description goes.
 *
 * A talent that is live gets a ring around the icon and a badge, and one with
 * a stream within a week gets its start, as in the list of talents. They are
 * put above the links, outside the `h1`, so they are not a part of the name.
 */
export function TalentPageHeader({
  streamStatus,
  talent,
}: TalentPageHeaderProps) {
  const isLive = streamStatus?.isLive ?? false

  return (
    <PageHeader
      breadcrumbs={[
        { href: '/talents', name: 'タレント一覧' },
        { name: talent.name },
      ]}
      description={
        <>
          <StreamStatusLine streamStatus={streamStatus} />
          <nav aria-label="リンク">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-meta">
              {getTalentLinks(talent).map((link) => (
                <li key={link.href}>
                  <TalentLinkItem link={link} />
                </li>
              ))}
            </ul>
          </nav>
        </>
      }
      title={
        <span className="flex items-center gap-4">
          <TalentIcon
            className={twMerge(isLive && LIVE_RING_CLASS_NAME)}
            size={64}
            talent={talent}
          />
          <span className="min-w-0 break-words">{talent.name}</span>
        </span>
      }
    />
  )
}

interface TalentPageHeadingProps {
  params: TalentPageParams
}

/**
 * Both are cached, so they are awaited together in the same `<Suspense>`
 * instead of streaming the stream status in later, which would move the
 * links down. The heading is still shown without the stream status when it
 * cannot be fetched.
 */
export async function TalentPageHeading({ params }: TalentPageHeadingProps) {
  const [talent, streamStatuses] = await Promise.all([
    getShownTalent(params),
    fetchTalentStreamStatusesSafe(),
  ])

  return (
    <TalentPageHeader
      streamStatus={streamStatuses[talent.id]}
      talent={talent}
    />
  )
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
