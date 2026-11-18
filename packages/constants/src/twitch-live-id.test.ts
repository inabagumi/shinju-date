import { describe, expect, it } from "vitest";

import {
  isLiveTwitchVideoId,
  streamIdFromLiveTwitchVideoId,
  toLiveTwitchVideoId,
} from "./twitch-live-id.js";

describe("live twitch video id helpers", () => {
  it("builds and detects synthetic live ids", () => {
    expect(toLiveTwitchVideoId("1234567890")).toBe("live:1234567890");
    expect(isLiveTwitchVideoId("live:1234567890")).toBe(true);
    expect(isLiveTwitchVideoId("1234567890")).toBe(false);
    expect(streamIdFromLiveTwitchVideoId("live:1234567890")).toBe("1234567890");
    expect(streamIdFromLiveTwitchVideoId("1234567890")).toBeNull();
  });
});
