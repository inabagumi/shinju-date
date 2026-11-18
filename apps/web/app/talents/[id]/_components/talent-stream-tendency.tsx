import { logger } from "@shinju-date/logger";
import { twMerge } from "@shinju-date/ui";
import { ChevronRight } from "lucide-react";

import { fetchTalentStreamStarts } from "@/lib/data/talents";
import { WEEKDAYS } from "@/lib/date-heading";
import {
  countStreamsByWeekdayAndHour,
  getStreamCountLevel,
  STREAM_TENDENCY_DAYS,
  STREAM_TENDENCY_MIN_STREAMS,
  summarizeStreamTendency,
} from "@/lib/stream-tendency";

import { getShownTalent } from "../_lib/get-shown-talent";
import type { TalentPageParams } from "../_lib/get-shown-talent";

/**
 * The background of a cell for each level of `getStreamCountLevel`. It is
 * always the accent, not the theme color of the talent, so the levels can be
 * told apart in both the light and the dark themes.
 */
const LEVEL_CLASS_NAMES = [
  "bg-muted",
  "bg-accent/25",
  "bg-accent/50",
  "bg-accent/75",
  "bg-accent",
] as const;

/**
 * The hours whose numbers are shown above the columns. The headings are read
 * out from the hidden text for every hour, as the browsers put a space between
 * a shown number and a hidden suffix.
 */
const LABELED_HOURS = new Set([0, 6, 12, 18]);

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

interface StreamTendencyProps {
  /** The counts of `countStreamsByWeekdayAndHour` */
  counts: number[][];
}

/**
 * The tendency of a talent's streams: how many of them started on each day of
 * the week and in each hour, as a table of cells shaded by the count. The
 * numbers are only read out, not shown in the cells.
 *
 * It is small, about 11px a cell in 21rem, so it fits beside the heading of
 * the page on wide screens and in the width of a phone. It is not what most
 * visitors come for, so on narrow screens it is folded into a line with the
 * busiest day and hour, not to push the videos down. On wide screens the
 * line is hidden and the content of the `<details>` is always shown.
 *
 * Nothing is rendered with fewer streams than `STREAM_TENDENCY_MIN_STREAMS`,
 * so no space is left for it.
 */
export const StreamTendency = ({ counts }: StreamTendencyProps) => {
  const { busiestHour, busiestWeekday, max, total } =
    summarizeStreamTendency(counts);

  if (
    total < STREAM_TENDENCY_MIN_STREAMS ||
    busiestHour === null ||
    busiestWeekday === null
  ) {
    return null;
  }

  return (
    <section
      aria-labelledby="stream-tendency-heading"
      className="mb-8 w-full max-w-84 shrink-0"
    >
      {/* The heading on wide screens; the line below takes its place on
          narrow ones */}
      <h2
        className="hidden text-body leading-normal font-semibold md:block"
        id="stream-tendency-heading"
      >
        配信の傾向
      </h2>
      {/* Browsers without `::details-content` cannot open it on wide screens,
          so they keep the line to open it */}
      <details className="group md:details-content:block md:details-content:[content-visibility:visible]">
        <summary className="flex cursor-pointer list-none items-center gap-1 rounded-control focus-ring supports-[selector(::details-content)]:md:hidden [&::-webkit-details-marker]:hidden">
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
          />
          <span className="text-body leading-normal font-semibold">
            配信の傾向
          </span>
          <span className="ml-1 text-meta text-muted">
            {WEEKDAYS[busiestWeekday]}曜日・
            <span className="tabular-nums">{busiestHour}</span>時台が多い
          </span>
        </summary>
        <p className="mt-1 text-meta text-muted md:mt-0">
          直近{STREAM_TENDENCY_DAYS}日の配信は
          <span className="tabular-nums">{total}</span>
          回。いちばん多いのは{WEEKDAYS[busiestWeekday]}曜日、時間帯は
          <span className="tabular-nums">{busiestHour}</span>時台です。
        </p>
        <table className="mt-2 w-full table-fixed border-separate border-spacing-0.5">
          <caption className="sr-only">曜日と時間帯ごとの配信回数</caption>
          <thead>
            <tr>
              <td className="w-5 p-0" />
              {HOURS.map((hour) => (
                <th
                  className="overflow-visible p-0 pb-0.5 text-left align-bottom text-caption leading-none font-normal whitespace-nowrap text-muted tabular-nums"
                  key={hour}
                  scope="col"
                >
                  {LABELED_HOURS.has(hour) && (
                    <span aria-hidden="true">{hour}</span>
                  )}
                  <span className="sr-only">{hour}時</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((weekday, weekdayIndex) => (
              <tr key={weekday}>
                <th
                  className="p-0 pr-1 text-left text-caption leading-none font-normal text-muted"
                  scope="row"
                >
                  <span aria-hidden="true">{weekday}</span>
                  <span className="sr-only">{weekday}曜日</span>
                </th>
                {HOURS.map((hour) => {
                  const count = counts[weekdayIndex]?.[hour] ?? 0;

                  return (
                    <td className="p-0" key={hour}>
                      <span
                        className={twMerge(
                          "block aspect-square",
                          LEVEL_CLASS_NAMES[getStreamCountLevel(count, max)]
                        )}
                        data-testid="stream-tendency-cell"
                      >
                        <span className="sr-only">{count}回</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
};

interface TalentStreamTendencyProps {
  params: TalentPageParams;
}

/**
 * The tendency of the streams of the talent of the page. It is not a part of
 * the page that must be shown, so nothing is rendered when the streams cannot
 * be fetched.
 */
export const TalentStreamTendency = async ({
  params,
}: TalentStreamTendencyProps) => {
  const talent = await getShownTalent(params);
  let starts: string[];

  try {
    starts = await fetchTalentStreamStarts(talent.id);
  } catch (error) {
    logger.error("Failed to fetch the streams of the talent", {
      error,
      talentId: talent.id,
    });

    return null;
  }

  return <StreamTendency counts={countStreamsByWeekdayAndHour(starts)} />;
};
