import { describe, expect, it } from "vitest";

import { parseTwitchUserIdentifier } from "./identifiers.js";

describe(parseTwitchUserIdentifier, () => {
  it("parses login names", () => {
    expect(parseTwitchUserIdentifier("example_user")).toStrictEqual({
      kind: "login",
      login: "example_user",
    });
    expect(parseTwitchUserIdentifier("Example_User")).toStrictEqual({
      kind: "login",
      login: "example_user",
    });
    expect(parseTwitchUserIdentifier("@streamer")).toStrictEqual({
      kind: "login",
      login: "streamer",
    });
  });

  it("parses numeric user IDs", () => {
    expect(parseTwitchUserIdentifier("123456789")).toStrictEqual({
      id: "123456789",
      kind: "id",
    });
  });

  it("parses Twitch channel URLs", () => {
    expect(
      parseTwitchUserIdentifier("https://www.twitch.tv/example_user")
    ).toStrictEqual({
      kind: "login",
      login: "example_user",
    });
    expect(
      parseTwitchUserIdentifier("https://twitch.tv/example_user/about")
    ).toStrictEqual({
      kind: "login",
      login: "example_user",
    });
    expect(parseTwitchUserIdentifier("www.twitch.tv/foo_bar")).toStrictEqual({
      kind: "login",
      login: "foo_bar",
    });
  });

  it("returns null for invalid input", () => {
    expect(parseTwitchUserIdentifier("")).toBeNull();
    expect(parseTwitchUserIdentifier("ab")).toBeNull();
    expect(
      parseTwitchUserIdentifier("https://www.twitch.tv/directory")
    ).toBeNull();
    expect(parseTwitchUserIdentifier("not a valid!!")).toBeNull();
  });
});
