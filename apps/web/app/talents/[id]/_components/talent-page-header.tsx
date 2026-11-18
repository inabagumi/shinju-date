import { twMerge } from "@shinju-date/ui";
import { CalendarPlus, ExternalLink } from "lucide-react";

import LiveBadge from "@/components/live-badge";
import PageHeader, { PageHeaderSkeleton } from "@/components/page-header";
import TalentIcon from "@/components/talent-icon";
import {
  LIVE_RING_CLASS_NAME,
  NextStream,
} from "@/components/talent-stream-status";
import { TextLink, TextLinkIcon } from "@/components/text-link";
import { fetchTalentStreamStatusesSafe } from "@/lib/data/talents";
import type { TalentDetail, TalentStreamStatus } from "@/lib/data/talents";
import { getTalentLinks } from "@/lib/talent-links";
import type { TalentLink } from "@/lib/talent-links";

import { getShownTalent } from "../_lib/get-shown-talent";
import type { TalentPageParams } from "../_lib/get-shown-talent";

interface TalentLinkItemProps {
  link: TalentLink;
}

function TalentLinkItem({ link }: TalentLinkItemProps) {
  if (link.external) {
    return (
      <TextLink href={link.href} rel="noopener noreferrer" target="_blank">
        {link.label}
        <TextLinkIcon>
          <ExternalLink />
        </TextLinkIcon>
      </TextLink>
    );
  }

  // The calendar is not a page, so it is not a `next/link` link
  return (
    <TextLink href={link.href}>
      <TextLinkIcon>
        <CalendarPlus />
      </TextLinkIcon>
      {link.label}
    </TextLink>
  );
}

interface StreamStatusLineProps {
  streamStatus?: TalentStreamStatus | undefined;
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
    );
  }

  if (streamStatus?.nextStreamAt) {
    return (
      <p className="mb-2">
        <NextStream
          className="text-meta text-muted"
          startsAt={streamStatus.nextStreamAt}
        />
      </p>
    );
  }

  return null;
}

interface TalentPageHeaderProps {
  /** Whether the talent is live and when it streams next, if known */
  streamStatus?: TalentStreamStatus | undefined;
  talent: TalentDetail;
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
  const isLive = streamStatus?.isLive ?? false;

  return (
    <PageHeader
      breadcrumbs={[
        { href: "/talents", name: "タレント一覧" },
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
  );
}

interface TalentPageHeadingProps {
  params: TalentPageParams;
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
  ]);

  return (
    <TalentPageHeader
      streamStatus={streamStatuses[talent.id]}
      talent={talent}
    />
  );
}

export function TalentPageHeadingSkeleton() {
  return <PageHeaderSkeleton description icon />;
}
