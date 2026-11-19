import { describe, expect, it } from "vitest";

import { parseYouTubeChannelIdentifier } from "./identifiers.js";

describe(parseYouTubeChannelIdentifier, () => {
  const channelId = "UCabcdefghijklmnopqrstuv";

  it("parses a bare channel ID", () => {
    expect(parseYouTubeChannelIdentifier(channelId)).toStrictEqual({
      id: channelId,
      kind: "id",
    });
  });

  it("parses a channel URL", () => {
    expect(
      parseYouTubeChannelIdentifier(
        `https://www.youtube.com/channel/${channelId}`
      )
    ).toStrictEqual({ id: channelId, kind: "id" });
    expect(
      parseYouTubeChannelIdentifier(`youtube.com/channel/${channelId}/videos`)
    ).toStrictEqual({ id: channelId, kind: "id" });
  });

  it("parses a handle with and without @", () => {
    expect(parseYouTubeChannelIdentifier("@example_handle")).toStrictEqual({
      handle: "example_handle",
      kind: "handle",
    });
    expect(parseYouTubeChannelIdentifier("example_handle")).toStrictEqual({
      handle: "example_handle",
      kind: "handle",
    });
  });

  it("parses a handle URL", () => {
    expect(
      parseYouTubeChannelIdentifier("https://www.youtube.com/@example_handle")
    ).toStrictEqual({ handle: "example_handle", kind: "handle" });
    expect(
      parseYouTubeChannelIdentifier(
        "https://youtube.com/@example_handle/videos"
      )
    ).toStrictEqual({ handle: "example_handle", kind: "handle" });
  });

  it("parses legacy /c/ and /user/ URLs as handles", () => {
    expect(
      parseYouTubeChannelIdentifier("https://www.youtube.com/c/ExampleName")
    ).toStrictEqual({ handle: "ExampleName", kind: "handle" });
    expect(
      parseYouTubeChannelIdentifier("https://www.youtube.com/user/ExampleUser")
    ).toStrictEqual({ handle: "ExampleUser", kind: "handle" });
  });

  it("returns null for empty or invalid input", () => {
    expect(parseYouTubeChannelIdentifier("")).toBeNull();
    expect(parseYouTubeChannelIdentifier("   ")).toBeNull();
    expect(parseYouTubeChannelIdentifier("ab")).toBeNull();
    expect(parseYouTubeChannelIdentifier("not a channel!!!")).toBeNull();
    expect(parseYouTubeChannelIdentifier("https://example.com/foo")).toBeNull();
  });
});
