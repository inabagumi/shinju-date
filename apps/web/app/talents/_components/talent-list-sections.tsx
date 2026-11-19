import {
  fetchTalentList,
  fetchTalentStreamStatusesSafe,
} from "@/lib/data/talents";

import TalentGrid from "./talent-grid";

/**
 * The number of talents, shown where the description of the page goes.
 * `fetchTalentList` is cached, so the talents are fetched only once with
 * `TalentListGrid`.
 */
export const TalentCount = async () => {
  const talents = await fetchTalentList();

  return <p className="tabular-nums">{talents.length}人</p>;
};

export const TalentCountSkeleton = () => (
  <div
    aria-hidden="true"
    className="h-[1lh] w-12 animate-pulse rounded-control bg-muted"
  />
);

/**
 * The list is still shown with the icons and the names when the stream
 * statuses cannot be fetched.
 */
export const TalentListGrid = async () => {
  const [talents, streamStatuses] = await Promise.all([
    fetchTalentList(),
    fetchTalentStreamStatusesSafe(),
  ]);

  return <TalentGrid streamStatuses={streamStatuses} talents={talents} />;
};
