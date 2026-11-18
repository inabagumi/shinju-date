import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAnnouncement } from "@/test/factories";
import { mockNow } from "@/test/now";
import { failSupabase, seedSupabase, setupSupabase } from "@/test/supabase";

import { fetchActiveAnnouncements } from "./announcements";

// Vitest does not run `'use cache'`, so only what the fetchers pass to the
// cache is checked
vi.mock(import("next/cache"), () => ({
  // A name of a profile or an object, which every overload of cacheLife takes
  cacheLife: vi.fn<(profile: string | object) => void>(),
  cacheTag: vi.fn<typeof cacheTag>(),
}));

setupSupabase();

/** The IDs of the given rows or results, to compare them in order */
function ids(rows: readonly { id: string }[]): string[] {
  return rows.map((row) => row.id);
}

describe("lib/data/announcements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe(fetchActiveAnnouncements, () => {
    beforeEach(() => {
      mockNow("2026-11-17T03:00:00Z");
    });

    it("returns the enabled announcements that have not ended, newest first", async () => {
      const older = createAnnouncement({
        created_at: "2026-11-01T00:00:00Z",
        end_at: "2026-11-20T00:00:00Z",
        start_at: "2026-11-10T00:00:00Z",
      });
      const newer = createAnnouncement({
        created_at: "2026-11-05T00:00:00Z",
        end_at: "2026-11-17T03:00:01Z",
        start_at: "2026-11-10T00:00:00Z",
      });
      // Not started yet, which the caller decides when to show
      const future = createAnnouncement({
        created_at: "2026-11-03T00:00:00Z",
        end_at: "2026-11-25T00:00:00Z",
        start_at: "2026-11-18T00:00:00Z",
      });

      await seedSupabase({
        announcements: [
          older,
          createAnnouncement({ enabled: false }),
          createAnnouncement({ end_at: "2026-11-17T03:00:00Z" }),
          newer,
          future,
        ],
      });

      await expect(fetchActiveAnnouncements()).resolves.toStrictEqual(
        [newer, future, older].map(
          ({ end_at, id, level, message, start_at }) => ({
            end_at,
            id,
            level,
            message,
            start_at,
          })
        )
      );
      expect(cacheLife).toHaveBeenCalledWith("minutes");
      expect(cacheTag).toHaveBeenCalledWith("announcements");
    });

    it("returns up to 10 announcements", async () => {
      const announcements = Array.from({ length: 11 }, (_, index) =>
        createAnnouncement({
          created_at: `2026-11-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
        })
      );

      await seedSupabase({ announcements });

      const fetched = await fetchActiveAnnouncements();

      expect(fetched).toHaveLength(10);
      expect(ids(fetched)).not.toContain(announcements[0]?.id);
    });

    it("throws when the announcements cannot be fetched", async () => {
      failSupabase("announcements", "failed");

      await expect(fetchActiveAnnouncements()).rejects.toThrow("failed");
    });
  });
});
