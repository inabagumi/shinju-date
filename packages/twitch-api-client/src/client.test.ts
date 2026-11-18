import { ApiClient } from "@twurple/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getTwitchApiClient", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when credentials are missing", async () => {
    vi.stubEnv("TWITCH_CLIENT_ID", "");
    vi.stubEnv("TWITCH_CLIENT_SECRET", "");

    const { getTwitchApiClient } = await import("./client.js");

    expect(() => getTwitchApiClient()).toThrow(/Client ID and Client Secret/u);
  });

  it("creates one client from the credentials in the environment", async () => {
    vi.stubEnv("TWITCH_CLIENT_ID", "test-client-id");
    vi.stubEnv("TWITCH_CLIENT_SECRET", "test-client-secret");

    const { getTwitchApiClient } = await import("./client.js");
    const client = getTwitchApiClient();

    expect(client).toBeInstanceOf(ApiClient);
    expect(getTwitchApiClient()).toBe(client);
  });
});
