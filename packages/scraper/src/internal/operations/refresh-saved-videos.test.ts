import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ErrorReporter, VideoFields } from "../../types.js";
import type { PlatformAdapter, SavedVideoBase } from "../platform.js";
import { createTestContext } from "../testing/context.js";
import { setupSupabase } from "../testing/supabase.js";
import {
  refreshSavedVideo,
  refreshSavedVideos,
} from "./refresh-saved-videos.js";
import { sweepUnavailableVideos } from "./sweep-unavailable-videos.js";

interface FakeSaved extends SavedVideoBase {
  platform_id: string;
}

interface FakeVideo {
  id: string;
  title: string;
}

type FakeAdapter = PlatformAdapter<FakeVideo, FakeSaved>;
type AfterRefresh = (saved: FakeSaved, fetched: FakeVideo) => Promise<boolean>;

const supabase = setupSupabase();
const reportError = vi.fn<ErrorReporter>();
const context = createTestContext({
  fetcher: null,
  reportError,
  supabaseClient: supabase.supabaseClient,
});

const createSaved = (platformId: string): FakeSaved => ({
  duration: "PT1H",
  id: `video-${platformId}`,
  platform_id: platformId,
  published_at: "2024-05-01T09:00:00+00:00",
  status: "ENDED",
  thumbnail_id: `thumb-${platformId}`,
  title: `Video ${platformId}`,
});

/** A platform that returns `videos` and reports every other ID missing. */
const createAdapter = (
  videos: FakeVideo[],
  { notLookedUp = [] }: { notLookedUp?: string[] } = {}
) => {
  const byId = new Map(videos.map((video) => [video.id, video]));
  const lookUp = vi.fn<FakeAdapter["lookUp"]>(async (savedVideos) => {
    const ids = savedVideos
      .map((saved) => saved.platform_id)
      .filter((id) => !notLookedUp.includes(id));

    return {
      fetchedById: new Map(
        ids.flatMap((id) => {
          const video = byId.get(id);

          return video ? [[id, video] as const] : [];
        })
      ),
      missingIds: ids.filter((id) => !byId.has(id)),
    };
  });
  const adapter: FakeAdapter = {
    getPlatformVideoId: (saved) => saved.platform_id,
    lookUp,
    platform: "youtube",
    savedVideoColumns: "id",
    toFields: (video): VideoFields => ({
      duration: "PT1H",
      published_at: "2024-05-01T09:00:00Z",
      status: "ENDED",
      title: video.title,
      video_kind: "standard",
    }),
  };

  return { adapter, lookUp };
};

describe("refresh saved videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe(refreshSavedVideos, () => {
    it("counts a video that only `afterRefresh` changed", async () => {
      supabase.respond(({ method }) =>
        method === "GET" ? [createSaved("a"), createSaved("b")] : []
      );
      const { adapter } = createAdapter([
        { id: "a", title: "Video a" },
        { id: "b", title: "Video b" },
      ]);
      const afterRefresh = vi.fn<AfterRefresh>(
        async (saved) => saved.id === "video-a"
      );

      const changed = await refreshSavedVideos(context, adapter, {
        afterRefresh,
        scope: "recent",
      });

      expect(changed).toBe(1);
      expect(afterRefresh).toHaveBeenCalledTimes(2);
      expect(supabase.written("PATCH", "videos")).toHaveLength(0);
    });

    it("runs `afterRefresh` after writing what changed", async () => {
      supabase.respond(({ method }) =>
        method === "GET" ? [createSaved("a")] : []
      );
      const { adapter } = createAdapter([{ id: "a", title: "Renamed" }]);
      const afterRefresh = vi.fn<AfterRefresh>(async () => {
        expect(supabase.written("PATCH", "videos")).toHaveLength(1);

        return false;
      });

      const changed = await refreshSavedVideos(context, adapter, {
        afterRefresh,
        scope: "live",
      });

      expect(changed).toBe(1);
      expect(afterRefresh).toHaveBeenCalledOnce();
      expect(supabase.written("PATCH", "videos")[0]?.body).toStrictEqual({
        title: "Renamed",
      });
    });

    it("does not run `afterRefresh` for a video the platform no longer returns", async () => {
      supabase.respond(({ method, table }) => {
        if (method === "GET") {
          return [createSaved("gone")];
        }

        return table === "rpc/soft_delete_videos" ? ["video-gone"] : [];
      });
      const { adapter } = createAdapter([]);
      const afterRefresh = vi.fn<AfterRefresh>(async () => true);

      const changed = await refreshSavedVideos(context, adapter, {
        afterRefresh,
        scope: "recent",
      });

      expect(changed).toBe(1);
      expect(afterRefresh).not.toHaveBeenCalled();
      expect(
        supabase.written("POST", "rpc/soft_delete_videos")[0]?.body
      ).toMatchObject({ p_video_ids: ["video-gone"] });
    });
  });

  describe(refreshSavedVideo, () => {
    it("returns `null` for a video the platform cannot be asked about", async () => {
      const { adapter } = createAdapter([], { notLookedUp: ["a"] });

      await expect(
        refreshSavedVideo(context, adapter, createSaved("a"))
      ).resolves.toBeNull();
      expect(supabase.requests).toHaveLength(0);
    });

    it("soft-deletes a video the platform no longer returns", async () => {
      supabase.respond(({ table }) =>
        table === "rpc/soft_delete_videos" ? ["video-gone"] : []
      );
      const { adapter } = createAdapter([]);

      await expect(
        refreshSavedVideo(context, adapter, createSaved("gone"))
      ).resolves.toBe("unavailable");
      expect(
        supabase.written("POST", "rpc/soft_delete_videos")[0]?.body
      ).toMatchObject({ p_video_ids: ["video-gone"] });
    });

    it("returns the columns that changed", async () => {
      supabase.respond(() => []);
      const { adapter } = createAdapter([{ id: "a", title: "Renamed" }]);

      await expect(
        refreshSavedVideo(context, adapter, createSaved("a"))
      ).resolves.toStrictEqual({
        changed: true,
        changes: { title: "Renamed" },
      });
    });
  });

  describe(sweepUnavailableVideos, () => {
    it("prefers `findMissing` over looking the videos up", async () => {
      supabase.respond(({ method, query }) =>
        method === "GET" && !query["id"] ? [createSaved("a")] : []
      );
      const { adapter, lookUp } = createAdapter([
        { id: "a", title: "Video a" },
      ]);
      const findMissing = vi.fn<NonNullable<FakeAdapter["findMissing"]>>(
        async () => []
      );

      const deleted = await sweepUnavailableVideos(context, {
        ...adapter,
        findMissing,
      });

      expect(deleted).toBe(0);
      expect(findMissing).toHaveBeenCalledExactlyOnceWith([createSaved("a")]);
      expect(lookUp).not.toHaveBeenCalled();
    });

    it("looks the videos up when the platform has no cheaper way", async () => {
      supabase.respond(({ method, query, table }) => {
        if (method === "GET") {
          return query["id"] ? [] : [createSaved("a"), createSaved("gone")];
        }

        return table === "rpc/soft_delete_videos" ? ["video-gone"] : [];
      });
      const { adapter, lookUp } = createAdapter([
        { id: "a", title: "Video a" },
      ]);

      const deleted = await sweepUnavailableVideos(context, adapter);

      expect(deleted).toBe(1);
      expect(lookUp).toHaveBeenCalledOnce();
      expect(
        supabase.written("POST", "rpc/soft_delete_videos")[0]?.body
      ).toMatchObject({ p_video_ids: ["video-gone"] });
    });
  });
});
