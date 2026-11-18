import type { SupabaseClient } from "@supabase/supabase-js";
import type { Redis } from "@upstash/redis";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkRedisHealth,
  checkSupabaseHealth,
  createReadinessResponse,
  runHealthChecks,
} from "./index.js";
import type { HealthCheckResult } from "./index.js";

/** The part of the Supabase query builder that the health check uses. */
interface TalentsTable {
  select: (columns: string) => {
    limit: (count: number) => Promise<{ error: { message: string } | null }>;
  };
}

// Mock Supabase client
const from = vi.fn<(table: string) => TalentsTable>();
// `from` returns only the part of the query builder that the check uses, so
// the client is typed through its keys.
const mockSupabaseClient = { from } as Partial<
  Record<keyof SupabaseClient, unknown>
> as SupabaseClient;

/** Makes the query on the talents table return the error. */
const respondWithError = (error: { message: string } | null): void => {
  from.mockReturnValue({
    select: () => ({ limit: async () => ({ error }) }),
  });
};

// Mock Redis client
const ping = vi.fn<Redis["ping"]>();
const mockRedisClient = { ping } as Partial<Redis> as Redis;

describe(checkSupabaseHealth, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return ok status when database connection is successful", async () => {
    respondWithError(null);

    const result = await checkSupabaseHealth(mockSupabaseClient);

    expect(result).toStrictEqual({ status: "ok" });
    expect(from).toHaveBeenCalledWith("talents");
  });

  it("should return error status when database query fails", async () => {
    const mockError = { message: "Connection failed" };
    respondWithError(mockError);

    const result = await checkSupabaseHealth(mockSupabaseClient);

    expect(result).toStrictEqual({
      details: "Connection failed",
      message: "Database connection failed",
      status: "error",
    });
  });

  it("should return error status when exception is thrown", async () => {
    from.mockImplementation(() => {
      throw new Error("Network error");
    });

    const result = await checkSupabaseHealth(mockSupabaseClient);

    expect(result).toStrictEqual({
      details: "Network error",
      message: "Database health check failed",
      status: "error",
    });
  });
});

describe(checkRedisHealth, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return ok status when Redis ping is successful", async () => {
    ping.mockResolvedValue("PONG");

    const result = await checkRedisHealth(mockRedisClient);

    expect(result).toStrictEqual({ status: "ok" });
    expect(ping).toHaveBeenCalledWith();
  });

  it("should return error status when Redis ping returns unexpected value", async () => {
    ping.mockResolvedValue("UNEXPECTED");

    const result = await checkRedisHealth(mockRedisClient);

    expect(result).toStrictEqual({
      details: "Expected PONG, got: UNEXPECTED",
      message: "Redis connection failed",
      status: "error",
    });
  });

  it("should return error status when Redis ping throws exception", async () => {
    ping.mockRejectedValue(new Error("Connection timeout"));

    const result = await checkRedisHealth(mockRedisClient);

    expect(result).toStrictEqual({
      details: "Connection timeout",
      message: "Redis health check failed",
      status: "error",
    });
  });
});

describe(runHealthChecks, () => {
  it("should return ok status when all checks pass", async () => {
    const checks = [
      vi
        .fn<() => Promise<HealthCheckResult>>()
        .mockResolvedValue({ status: "ok" }),
      vi
        .fn<() => Promise<HealthCheckResult>>()
        .mockResolvedValue({ status: "ok" }),
    ];

    const result = await runHealthChecks(checks);

    expect(result.status).toBe("ok");
    expect(result.results).toHaveLength(2);
    expect(result.results.every((r) => r.status === "ok")).toBeTruthy();
  });

  it("should return error status when one check fails", async () => {
    const checks = [
      vi
        .fn<() => Promise<HealthCheckResult>>()
        .mockResolvedValue({ status: "ok" }),
      vi.fn<() => Promise<HealthCheckResult>>().mockResolvedValue({
        details: "Error details",
        message: "Check failed",
        status: "error",
      }),
    ];

    const result = await runHealthChecks(checks);

    expect(result.status).toBe("error");
    expect(result.results).toHaveLength(2);
    expect(result.results[1]?.status).toBe("error");
  });

  it("should run all checks even if some fail", async () => {
    const checks = [
      vi
        .fn<() => Promise<HealthCheckResult>>()
        .mockResolvedValue({ status: "error" }),
      vi
        .fn<() => Promise<HealthCheckResult>>()
        .mockResolvedValue({ status: "ok" }),
    ];

    const result = await runHealthChecks(checks);

    expect(checks[0]).toHaveBeenCalledWith();
    expect(checks[1]).toHaveBeenCalledWith();
    expect(result.results).toHaveLength(2);
  });
});

describe(createReadinessResponse, () => {
  it("should return 200 response for ok status", async () => {
    const response = createReadinessResponse("ok");

    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json).toStrictEqual({ status: "ok" });
  });

  it("should return 503 response for error status with results", async () => {
    const results = [
      { status: "ok" as const },
      {
        details: "Connection lost",
        message: "DB failed",
        status: "error" as const,
      },
    ];

    const response = createReadinessResponse("error", results);

    expect(response.status).toBe(503);

    const json = await response.json();
    expect(json).toStrictEqual({
      checks: results,
      message: "Service not ready",
      status: "error",
    });
  });

  it("should return 503 response for error status with error details", async () => {
    const errorDetails = {
      details: "Custom error details",
      message: "Custom error message",
    };

    const response = createReadinessResponse("error", undefined, errorDetails);

    expect(response.status).toBe(503);

    const json = await response.json();
    expect(json).toStrictEqual({
      details: "Custom error details",
      message: "Custom error message",
      status: "error",
    });
  });

  it("should return 503 response with default message for error status without details", async () => {
    const response = createReadinessResponse("error");

    expect(response.status).toBe(503);

    const json = await response.json();
    expect(json).toStrictEqual({
      message: "Health check failed",
      status: "error",
    });
  });
});
