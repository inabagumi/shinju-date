import type { syncYouTubeChannelIcon } from "@shinju-date/scraper/youtube";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TypedSupabaseClient } from "@/lib/supabase";

import {
  hasProfileImageChanged,
  syncYouTubeChannelIconSafely,
} from "./youtube-channel-icon";

vi.mock(import("@/lib/supabase/admin"), () => ({
  // A stand-in that only tells the service role client apart
  getSupabaseAdminClient: () =>
    ({
      kind: "service-role",
    }) as Partial<TypedSupabaseClient> as TypedSupabaseClient,
}));

vi.mock(import("@shinju-date/logger"), async () => {
  const { createMockLogger } = await import("@/test/logger");

  return { logger: createMockLogger() };
});

vi.mock(import("@shinju-date/scraper/youtube"), () => ({
  syncYouTubeChannelIcon: vi.fn<typeof syncYouTubeChannelIcon>(),
}));

const channel = {
  snippet: {
    thumbnails: {
      high: { height: 800, url: "https://yt3.ggpht.com/a", width: 800 },
    },
    title: "Example Channel",
  },
};
const saved = {
  id: "channel-row-1",
  profile_images: null,
  youtube_channel_id: "UCabcdefghijklmnopqrstuv",
};

describe(syncYouTubeChannelIconSafely, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs the icon with the service role client", async () => {
    const { syncYouTubeChannelIcon } =
      await import("@shinju-date/scraper/youtube");
    vi.mocked(syncYouTubeChannelIcon).mockResolvedValue("created");

    await expect(syncYouTubeChannelIconSafely(channel, saved)).resolves.toBe(
      "created"
    );
    expect(syncYouTubeChannelIcon).toHaveBeenCalledWith({
      channel,
      saved,
      supabaseClient: { kind: "service-role" },
    });
  });

  it("logs a failure without the error object and returns null", async () => {
    const { logger } = await import("@shinju-date/logger");
    const { syncYouTubeChannelIcon } =
      await import("@shinju-date/scraper/youtube");
    const error = Object.assign(new TypeError("Expected an image"), {
      cause: { headers: { authorization: "Bearer secret" } },
    });
    vi.mocked(syncYouTubeChannelIcon).mockRejectedValue(error);

    await expect(
      syncYouTubeChannelIconSafely(channel, saved)
    ).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      "YouTubeチャンネルのアイコンを同期できませんでした",
      {
        errorMessage: "Expected an image",
        errorName: "TypeError",
        youtubeChannelId: saved.youtube_channel_id,
      }
    );
  });
});

describe(hasProfileImageChanged, () => {
  it("is true only when the icon was written", () => {
    expect(hasProfileImageChanged("created")).toBeTruthy();
    expect(hasProfileImageChanged("replaced")).toBeTruthy();
    expect(hasProfileImageChanged("removed")).toBeTruthy();
    expect(hasProfileImageChanged("unchanged")).toBeFalsy();
    expect(hasProfileImageChanged(null)).toBeFalsy();
  });
});
