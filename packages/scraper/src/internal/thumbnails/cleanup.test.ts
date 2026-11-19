import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { mockStorage } from "../testing/images.js";
import { postgresError, setupSupabase } from "../testing/supabase.js";
import {
  removeUnusedThumbnails,
  UNUSED_THUMBNAIL_GRACE_PERIOD,
} from "./cleanup.js";

const supabase = setupSupabase();

const STORAGE_DELETE_URL =
  "https://fake.supabase.test/storage/v1/object/thumbnails";
const now = Temporal.Instant.from("2024-05-08T12:34:56.789Z");
const olderThan = UNUSED_THUMBNAIL_GRACE_PERIOD;

const unusedThumbnail = (index: number) => ({
  id: `thumb-${index}`,
  path: `vod-${index}/a.jpg`,
  videos: [],
});

/** The IDs a `DELETE thumbnails` request deletes, e.g. `in.(a,b)`. */
const deletedIds = (): (string | undefined)[] =>
  supabase.written("DELETE", "thumbnails").map(({ query }) => query["id"]);

describe(removeUnusedThumbnails, () => {
  it("lists the oldest thumbnails no video uses that are past the grace period", async () => {
    mockStorage(supabase, "thumbnails");
    supabase.respond(() => []);

    await expect(
      removeUnusedThumbnails(supabase.supabaseClient, { now, olderThan })
    ).resolves.toBe(0);

    expect(supabase.requests).toHaveLength(1);
    expect(supabase.requests[0]).toMatchObject({
      method: "GET",
      query: {
        limit: "500",
        order: "updated_at.asc",
        select: "id,path,videos(id)",
        // A week before `now`.
        updated_at: "lt.2024-05-01T12:34:56Z",
        videos: "is.null",
      },
      table: "thumbnails",
    });
  });

  it("deletes unused thumbnails, then their images", async () => {
    const { removed } = mockStorage(supabase, "thumbnails");
    supabase.respondWith({
      "DELETE thumbnails": ({ query }) =>
        query["id"] === "in.(thumb-1,thumb-2)"
          ? [{ id: "thumb-1" }, { id: "thumb-2" }]
          : [],
      "GET thumbnails": [unusedThumbnail(1), unusedThumbnail(2)],
    });

    await expect(
      removeUnusedThumbnails(supabase.supabaseClient, { now, olderThan })
    ).resolves.toBe(2);
    expect(deletedIds()).toStrictEqual(["in.(thumb-1,thumb-2)"]);
    expect(removed).toStrictEqual([["vod-1/a.jpg", "vod-2/a.jpg"]]);
  });

  it("deletes in batches", async () => {
    const { removed } = mockStorage(supabase, "thumbnails");
    const thumbnails = Array.from({ length: 150 }, (_, index) =>
      unusedThumbnail(index)
    );
    supabase.respondWith({
      "DELETE thumbnails": ({ query }) =>
        (query["id"] ?? "")
          .replace(/^in\.\((?<ids>.*)\)$/u, "$<ids>")
          .split(",")
          .map((id) => ({ id })),
      "GET thumbnails": thumbnails,
    });

    await expect(
      removeUnusedThumbnails(supabase.supabaseClient, { now, olderThan })
    ).resolves.toBe(150);
    expect(deletedIds()).toHaveLength(2);
    expect(removed.map((paths) => paths.length)).toStrictEqual([100, 50]);
  });

  it("keeps thumbnails that a video uses again and deletes the rest", async () => {
    const { removed } = mockStorage(supabase, "thumbnails");
    supabase.respondWith({
      "DELETE thumbnails": ({ query }) =>
        query["id"] === "eq.thumb-1"
          ? [{ id: "thumb-1" }]
          : postgresError("23503", "violates foreign key constraint"),
      "GET thumbnails": [unusedThumbnail(1), unusedThumbnail(2)],
    });

    await expect(
      removeUnusedThumbnails(supabase.supabaseClient, { now, olderThan })
    ).resolves.toBe(1);
    expect(deletedIds()).toStrictEqual([
      "in.(thumb-1,thumb-2)",
      "eq.thumb-1",
      "eq.thumb-2",
    ]);
    expect(removed).toStrictEqual([["vod-1/a.jpg"]]);
  });

  it("does not count thumbnails that are already gone", async () => {
    const { removed } = mockStorage(supabase, "thumbnails");
    supabase.respondWith({
      "DELETE thumbnails": [{ id: "thumb-2" }],
      "GET thumbnails": [unusedThumbnail(1), unusedThumbnail(2)],
    });

    await expect(
      removeUnusedThumbnails(supabase.supabaseClient, { now, olderThan })
    ).resolves.toBe(1);
    expect(removed).toStrictEqual([["vod-2/a.jpg"]]);
  });

  it("still counts thumbnails whose images cannot be removed", async () => {
    supabase.server.use(
      http.delete(STORAGE_DELETE_URL, () =>
        HttpResponse.json({ message: "unavailable" }, { status: 503 })
      )
    );
    supabase.respondWith({
      "DELETE thumbnails": [{ id: "thumb-1" }],
      "GET thumbnails": [unusedThumbnail(1)],
    });

    await expect(
      removeUnusedThumbnails(supabase.supabaseClient, { now, olderThan })
    ).resolves.toBe(1);
  });

  it("fails when unused thumbnails cannot be listed", async () => {
    supabase.respond(() => postgresError("57014", "canceling statement"));

    await expect(
      removeUnusedThumbnails(supabase.supabaseClient, { now, olderThan })
    ).rejects.toThrow("Failed to list unused thumbnails");
  });

  it("fails when unused thumbnails cannot be deleted", async () => {
    const { removed } = mockStorage(supabase, "thumbnails");
    supabase.respondWith({
      "DELETE thumbnails": () => postgresError("42501", "permission denied"),
      "GET thumbnails": [unusedThumbnail(1)],
    });

    await expect(
      removeUnusedThumbnails(supabase.supabaseClient, { now, olderThan })
    ).rejects.toThrow("Failed to delete unused thumbnails");
    expect(removed).toStrictEqual([]);
  });
});
