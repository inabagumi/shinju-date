// @vitest-environment node

import { REDIS_KEYS } from "@shinju-date/constants";
import {
  getRedirectUrl,
  getRewrittenUrl,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redisGet = vi.fn<(key: string) => Promise<unknown>>();

vi.mock("@/lib/redis", () => ({
  getRedisClient: () => ({ get: redisGet }),
}));

const BASE_URL = "https://shinju.date";

async function importProxy() {
  // The proxy keeps the maintenance mode in a module variable, so each test
  // starts from a fresh module.
  vi.resetModules();

  return import("./proxy");
}

type ProxyFunction = Awaited<ReturnType<typeof importProxy>>["proxy"];

/**
 * Runs the proxy for a path. The testing helpers of Next.js take a
 * `NextResponse`, and they only read its headers.
 */
async function run(proxy: ProxyFunction, path: string): Promise<NextResponse> {
  const response = await proxy(new NextRequest(new URL(path, BASE_URL)));

  return response as NextResponse;
}

describe("config.matcher", () => {
  async function doesMatch(path: string): Promise<boolean> {
    const { config } = await importProxy();

    return unstable_doesMiddlewareMatch({ config, url: `${BASE_URL}${path}` });
  }

  it.each([
    "/",
    "/videos",
    "/videos/歌枠",
    "/talents",
    "/talents/abc",
    "/schedule",
    "/schedule/2026-11-17",
    "/about",
    "/icons",
    "/monitoring-page",
  ])("runs for the page %s", async (path) => {
    await expect(doesMatch(path)).resolves.toBe(true);
  });

  it.each([
    "/_next/static/chunks/main.js",
    "/_next/image?url=%2Fhero.jpg&w=640&q=75",
    "/api/healthz",
    "/images/thumbnails/abc",
    "/images/profile-images/abc",
    "/videos.ics",
    "/talents/abc.ics",
    "/sitemap.xml",
    "/robots.txt",
    "/opensearch.xml",
    "/manifest.webmanifest",
    "/favicon.ico",
    "/icon",
    "/apple-icon",
    "/opengraph-image.jpg",
    "/talents/abc/opengraph-image",
    "/monitoring",
    "/monitoring?o=1&p=2",
    "/hero.png",
  ])("does not run for %s", async (path) => {
    await expect(doesMatch(path)).resolves.toBe(false);
  });
});

describe("proxy", () => {
  beforeEach(() => {
    redisGet.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    redisGet.mockReset();
  });

  it("shows the maintenance page while the maintenance mode is on", async () => {
    redisGet.mockResolvedValue(true);
    const { proxy } = await importProxy();

    const response = await run(proxy, "/videos");

    expect(redisGet).toHaveBeenCalledWith(REDIS_KEYS.MAINTENANCE_MODE);
    expect(getRewrittenUrl(response)).toBe(`${BASE_URL}/maintenance.html`);
  });

  it("passes the request while the maintenance mode is off", async () => {
    const { proxy } = await importProxy();

    const response = await run(proxy, "/videos");

    expect(getRewrittenUrl(response)).toBeNull();
    expect(getRedirectUrl(response)).toBeNull();
  });

  it("passes the request when Redis cannot be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    redisGet.mockRejectedValue(new Error("unavailable"));
    const { proxy } = await importProxy();

    const response = await run(proxy, "/videos");

    expect(getRewrittenUrl(response)).toBeNull();
  });

  it("redirects a legacy search", async () => {
    const { proxy } = await importProxy();

    const response = await run(proxy, "/videos?q=歌枠");

    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe(
      `${BASE_URL}/videos/${encodeURIComponent("歌枠")}`
    );
  });

  it("reads Redis once for the requests within 5 seconds", async () => {
    const start = Temporal.Instant.from("2026-11-17T00:00:00Z");
    const now = vi.spyOn(Temporal.Now, "instant").mockReturnValue(start);
    const { proxy } = await importProxy();

    await Promise.all([run(proxy, "/videos"), run(proxy, "/talents")]);
    now.mockReturnValue(start.add({ milliseconds: 4999 }));
    await run(proxy, "/schedule");

    expect(redisGet).toHaveBeenCalledOnce();
  });

  it("reads Redis again after 5 seconds", async () => {
    const start = Temporal.Instant.from("2026-11-17T00:00:00Z");
    const now = vi.spyOn(Temporal.Now, "instant").mockReturnValue(start);
    const { proxy } = await importProxy();

    const before = await run(proxy, "/videos");

    redisGet.mockResolvedValue(true);
    now.mockReturnValue(start.add({ seconds: 5 }));
    const after = await run(proxy, "/videos");

    expect(redisGet).toHaveBeenCalledTimes(2);
    expect(getRewrittenUrl(before)).toBeNull();
    expect(getRewrittenUrl(after)).toBe(`${BASE_URL}/maintenance.html`);
  });
});
