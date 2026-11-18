import type { youtube_v3 as youtube } from "@googleapis/youtube";
import { describe, expect, it } from "vitest";

import { isFilteredYouTubeChannel } from "./channels.js";

describe(isFilteredYouTubeChannel, () => {
  const channel = {
    contentDetails: { relatedPlaylists: { uploads: "UU12345" } },
    id: "UC12345",
    snippet: { customUrl: "@testchannel", title: "Test Channel" },
  } satisfies youtube.Schema$Channel;

  it("accepts a channel with an ID, an uploads playlist and a title", () => {
    expect(isFilteredYouTubeChannel(channel)).toBeTruthy();
  });

  it("accepts a channel without a custom URL", () => {
    expect(
      isFilteredYouTubeChannel({
        ...channel,
        snippet: { title: "Test Channel" },
      })
    ).toBeTruthy();
  });

  it("rejects a channel without an ID", () => {
    expect(
      isFilteredYouTubeChannel({
        contentDetails: channel.contentDetails,
        snippet: channel.snippet,
      })
    ).toBeFalsy();
    expect(isFilteredYouTubeChannel({ ...channel, id: null })).toBeFalsy();
  });

  it("rejects a channel without an uploads playlist", () => {
    expect(
      isFilteredYouTubeChannel({
        ...channel,
        contentDetails: { relatedPlaylists: {} },
      })
    ).toBeFalsy();
    expect(
      isFilteredYouTubeChannel({ id: channel.id, snippet: channel.snippet })
    ).toBeFalsy();
  });

  it("rejects a channel without a title", () => {
    expect(isFilteredYouTubeChannel({ ...channel, snippet: {} })).toBeFalsy();
    expect(
      isFilteredYouTubeChannel({
        contentDetails: channel.contentDetails,
        id: channel.id,
      })
    ).toBeFalsy();
  });
});
