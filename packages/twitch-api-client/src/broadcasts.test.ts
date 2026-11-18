import type { ApiClient } from "@twurple/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getArchivedStreamId,
  getArchiveOfStream,
  getLiveStream,
  getTwitchVideoStatus,
} from "./broadcasts.js";
import type { TwitchVideo } from "./types.js";

describe(getTwitchVideoStatus, () => {
  it("treats archives and highlights as ended broadcasts", () => {
    expect(getTwitchVideoStatus("archive")).toBe("ENDED");
    expect(getTwitchVideoStatus("highlight")).toBe("ENDED");
  });

  it("treats uploads and clips as published videos", () => {
    expect(getTwitchVideoStatus("upload")).toBe("PUBLISHED");
    expect(getTwitchVideoStatus("clip")).toBe("PUBLISHED");
  });
});

describe(getArchivedStreamId, () => {
  it("returns the stream ID of an archive", () => {
    expect(
      getArchivedStreamId({
        stream_id: "42",
        type: "archive",
      } as TwitchVideo)
    ).toBe("42");
  });

  it("returns null for archives without a stream and other videos", () => {
    expect(
      getArchivedStreamId({ stream_id: null, type: "archive" } as TwitchVideo)
    ).toBeNull();
    expect(
      getArchivedStreamId({
        stream_id: "42",
        type: "highlight",
      } as TwitchVideo)
    ).toBeNull();
    expect(
      getArchivedStreamId({ stream_id: "42", type: "upload" } as TwitchVideo)
    ).toBeNull();
  });
});

describe("broadcast lookups", () => {
  const getStreamsByUserIds =
    vi.fn<(userIds: string[]) => Promise<ReturnType<typeof helixStream>[]>>();
  const getVideosByUser =
    vi.fn<
      (
        ...args: Parameters<ApiClient["videos"]["getVideosByUser"]>
      ) => Promise<{ data: ReturnType<typeof helixArchive>[] }>
    >();
  const client = {
    streams: { getStreamsByUserIds },
    videos: { getVideosByUser },
  } as unknown as ApiClient;

  const helixStream = (id: string, userId = "user-1") => ({
    gameId: "1",
    gameName: "Just Chatting",
    id,
    isMature: false,
    language: "ja",
    startDate: new Date("2024-01-01T00:00:00Z"),
    tags: [],
    thumbnailUrl: "https://example.com/{width}x{height}.jpg",
    title: `Stream ${id}`,
    type: "live",
    userDisplayName: "Alice",
    userId,
    userName: "alice",
    viewers: 10,
  });

  const helixArchive = (id: string, streamId: string | null) => ({
    creationDate: new Date("2024-01-01T00:00:00Z"),
    description: "",
    durationInSeconds: 3600,
    id,
    isPublic: true,
    language: "ja",
    publishDate: new Date("2024-01-01T00:00:00Z"),
    streamId,
    thumbnailUrl: "",
    title: `Archive ${id}`,
    type: "archive",
    url: `https://www.twitch.tv/videos/${id}`,
    userDisplayName: "Alice",
    userId: "user-1",
    userName: "alice",
    views: 1,
  });

  beforeEach(() => {
    getStreamsByUserIds.mockReset();
    getVideosByUser.mockReset();
  });

  it("returns the stream while the broadcast is on air", async () => {
    getStreamsByUserIds.mockResolvedValue([helixStream("42")]);

    await expect(
      getLiveStream({ client, streamId: "42", userId: "user-1" })
    ).resolves.toMatchObject({ id: "42", title: "Stream 42" });
    expect(getStreamsByUserIds).toHaveBeenCalledWith(["user-1"]);
  });

  it("returns null once the broadcaster went offline or started another stream", async () => {
    getStreamsByUserIds.mockResolvedValueOnce([]);
    getStreamsByUserIds.mockResolvedValueOnce([helixStream("43")]);

    await expect(
      getLiveStream({ client, streamId: "42", userId: "user-1" })
    ).resolves.toBeNull();
    await expect(
      getLiveStream({ client, streamId: "42", userId: "user-1" })
    ).resolves.toBeNull();
  });

  it("finds the archive of a broadcast by its stream ID", async () => {
    getVideosByUser.mockResolvedValue({
      data: [helixArchive("900", "41"), helixArchive("901", "42")],
    });

    await expect(
      getArchiveOfStream({ client, streamId: "42", userId: "user-1" })
    ).resolves.toMatchObject({ id: "901", stream_id: "42" });
    expect(getVideosByUser).toHaveBeenCalledWith("user-1", {
      limit: 100,
      type: "archive",
    });
  });

  it("returns null when Twitch keeps no archive of the broadcast", async () => {
    getVideosByUser.mockResolvedValue({
      data: [helixArchive("900", "41"), helixArchive("902", null)],
    });

    await expect(
      getArchiveOfStream({ client, streamId: "42", userId: "user-1" })
    ).resolves.toBeNull();
  });
});
