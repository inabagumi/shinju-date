import type { Tables } from "@shinju-date/database";
import { describe, expect, it } from "vitest";

import { createFakeSupabaseClient } from "../test/fake-clients.js";
import { countSummaryStats } from "./index.js";

type VideoRow = Pick<
  Tables<"videos">,
  "created_at" | "deleted_at" | "status" | "visible"
>;
type TalentRow = Pick<Tables<"talents">, "created_at" | "deleted_at">;
type TermRow = Pick<Tables<"terms">, "created_at">;

const asOf = Temporal.Instant.from("2025-11-13T15:00:00Z");
const before = "2025-11-01T00:00:00Z";
const after = "2025-11-14T00:00:00Z";

function video(
  status: VideoRow["status"],
  overrides: Partial<VideoRow> = {}
): VideoRow {
  return {
    created_at: before,
    deleted_at: null,
    status,
    visible: true,
    ...overrides,
  };
}

const videos: VideoRow[] = [
  video("PUBLISHED"),
  video("PUBLISHED"),
  video("PUBLISHED"),
  video("LIVE"),
  video("ENDED"),
  video("ENDED"),
  video("UPCOMING"),
  video("PUBLISHED", { visible: false }),
  // Deleted before `asOf`
  video("ENDED", { deleted_at: "2025-11-10T00:00:00Z" }),
  // Created after `asOf`
  video("PUBLISHED", { created_at: after }),
  // Deleted after `asOf`, so it was still public at `asOf`
  video("PUBLISHED", { deleted_at: after }),
];

const talents: TalentRow[] = [
  { created_at: before, deleted_at: null },
  { created_at: before, deleted_at: "2025-11-10T00:00:00Z" },
  { created_at: before, deleted_at: after },
  { created_at: after, deleted_at: null },
];

const terms: TermRow[] = [
  { created_at: before },
  { created_at: before },
  { created_at: after },
];

const supabaseClient = createFakeSupabaseClient({ talents, terms, videos });

describe(countSummaryStats, () => {
  it("counts the rows as they are now without asOf", async () => {
    const stats = await countSummaryStats(supabaseClient);

    expect(stats).toStrictEqual({
      deletedVideos: 2,
      hiddenVideos: 1,
      scheduledVideos: 1,
      totalTalents: 2,
      totalTerms: 3,
      // Not deleted, including the video created after `asOf`
      totalVideos: 9,
      // 4 PUBLISHED (including the one created after `asOf`) + 1 LIVE + 2 ENDED
      visibleVideos: 7,
    });
  });

  it("counts the rows as they were at asOf", async () => {
    const stats = await countSummaryStats(supabaseClient, { asOf });

    expect(stats).toStrictEqual({
      deletedVideos: 1,
      hiddenVideos: 1,
      scheduledVideos: 1,
      totalTalents: 2,
      totalTerms: 2,
      totalVideos: 9,
      // 4 PUBLISHED (including the one deleted after `asOf`) + 1 LIVE + 2 ENDED
      visibleVideos: 7,
    });
  });

  it("counts visible PUBLISHED videos as public", async () => {
    const stats = await countSummaryStats(
      createFakeSupabaseClient({
        talents: [],
        terms: [],
        videos: [video("PUBLISHED"), video("PUBLISHED", { visible: false })],
      }),
      { asOf }
    );

    expect(stats.visibleVideos).toBe(1);
    expect(stats.hiddenVideos).toBe(1);
  });

  it("uses the same conditions with and without asOf", async () => {
    const rows = {
      talents: [{ created_at: before, deleted_at: null }],
      terms: [{ created_at: before }],
      videos: videos.filter(
        (row) => row.created_at === before && row.deleted_at === null
      ),
    };
    const client = createFakeSupabaseClient(rows);

    await expect(countSummaryStats(client, { asOf })).resolves.toStrictEqual(
      await countSummaryStats(client)
    );
  });

  it("counts empty tables as 0", async () => {
    const stats = await countSummaryStats(createFakeSupabaseClient({}));

    expect(Object.values(stats)).toStrictEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("throws with the name of the count that failed", async () => {
    const client = createFakeSupabaseClient(
      { talents, terms, videos },
      { errors: { terms: "permission denied" } }
    );

    await expect(countSummaryStats(client)).rejects.toThrow(
      "countSummaryStats.totalTerms: permission denied"
    );
  });
});
