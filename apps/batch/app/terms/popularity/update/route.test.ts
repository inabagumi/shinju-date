import type * as Sentry from "@sentry/nextjs";
import type { Redis } from "@upstash/redis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ServerEnv } from "@/lib/env";
import type * as Lock from "@/lib/lock";
import type { TypedSupabaseClient } from "@/lib/supabase";

import type * as UpdateTermPopularity from "./_lib/update-term-popularity";

const { createAfterMock, createLoggerMock } = await vi.hoisted(
  () => import("@/test/mocks")
);

// Mock dependencies
const mockSupabaseClient = {
  from: vi.fn<TypedSupabaseClient["from"]>(),
} as Partial<TypedSupabaseClient> as TypedSupabaseClient;

const mockRedisClient = {
  zrange: vi.fn<Redis["zrange"]>(),
} as Partial<Redis> as Redis;

const acquireLock = vi.fn<typeof Lock.acquireLock>();
const releaseLock = vi.fn<typeof Lock.releaseLock>();

const mockUpdateTermPopularity =
  vi.fn<typeof UpdateTermPopularity.updateTermPopularity>();

const mockServerEnv: ServerEnv = {
  CRON_SECRET: undefined,
} as Partial<ServerEnv> as ServerEnv;

// Mock modules
vi.mock(import("@/lib/supabase"), () => ({
  supabaseClient: mockSupabaseClient,
}));

vi.mock(import("@/lib/redis"), () => ({
  redisClient: mockRedisClient,
}));

vi.mock(import("@/lib/env"), () => ({
  serverEnv: mockServerEnv,
}));

vi.mock(import("@/lib/lock"), () => ({ acquireLock, releaseLock }));

vi.mock(import("./_lib/update-term-popularity"), () => ({
  updateTermPopularity: mockUpdateTermPopularity,
}));

vi.mock(import("@sentry/nextjs"), () => ({
  captureCheckIn: vi.fn<typeof Sentry.captureCheckIn>(() => "mock-check-in-id"),
  captureException: vi.fn<typeof Sentry.captureException>(),
  flush: vi.fn<typeof Sentry.flush>(),
}));

vi.mock(import("@shinju-date/logger"), () => ({
  logger: createLoggerMock(),
}));

vi.mock(import("next/server"), () => ({ after: createAfterMock() }));

describe("POST /terms/popularity/update", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    // Import after mocks are set up
    const module = await import("./route");
    POST = module.POST;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockServerEnv.CRON_SECRET = undefined;
  });

  it("should successfully update term popularity", async () => {
    // Setup
    acquireLock.mockResolvedValue("lock-value");
    mockUpdateTermPopularity.mockResolvedValue({
      notFound: 5,
      total: 100,
      updated: 95,
    });

    // Execute
    const request = new Request(
      "http://localhost:5000/terms/popularity/update",
      {
        method: "POST",
      }
    );
    const response = await POST(request);

    // Verify
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toStrictEqual({
      notFound: 5,
      total: 100,
      updated: 95,
    });
    expect(mockUpdateTermPopularity).toHaveBeenCalledWith(
      mockRedisClient,
      mockSupabaseClient
    );
  });

  it("should return 429 while the previous run is still running", async () => {
    // Setup
    acquireLock.mockResolvedValue(null);

    // Execute
    const request = new Request(
      "http://localhost:5000/terms/popularity/update",
      {
        method: "POST",
      }
    );
    const response = await POST(request);

    // Verify
    expect(response.status).toBe(429);
    expect(mockUpdateTermPopularity).not.toHaveBeenCalled();
  });

  it("should return 500 when update fails", async () => {
    const Sentry = await import("@sentry/nextjs");
    const error = new Error("Database error");

    // Setup
    acquireLock.mockResolvedValue("lock-value");
    mockUpdateTermPopularity.mockRejectedValue(error);

    // Execute
    const request = new Request(
      "http://localhost:5000/terms/popularity/update",
      {
        method: "POST",
      }
    );
    const response = await POST(request);

    // Verify
    expect(response.status).toBe(500);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(Sentry.captureCheckIn).toHaveBeenLastCalledWith({
      checkInId: "mock-check-in-id",
      monitorSlug: "/terms/popularity/update",
      status: "error",
    });
  });

  it("should verify CRON_SECRET when provided", async () => {
    // Setup
    mockServerEnv.CRON_SECRET = "test-secret";

    acquireLock.mockResolvedValue("lock-value");

    // Execute with wrong secret
    const request = new Request(
      "http://localhost:5000/terms/popularity/update",
      {
        headers: {
          Authorization: "Bearer wrong-secret",
        },
        method: "POST",
      }
    );
    const response = await POST(request);

    // Verify
    expect(response.status).toBe(401);
    expect(mockUpdateTermPopularity).not.toHaveBeenCalled();
  });
});
