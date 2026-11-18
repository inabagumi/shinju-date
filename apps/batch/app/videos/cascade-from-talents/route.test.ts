import type * as Sentry from "@sentry/nextjs";
import type * as WebCache from "@shinju-date/web-cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as Lock from "@/lib/lock";
import type { TypedSupabaseClient } from "@/lib/supabase";

import type * as CascadeFromTalents from "./_lib/cascade-from-talents";

const { createAfterMock, createLoggerMock } = await vi.hoisted(
  () => import("@/test/mocks")
);

const mockSupabaseClient =
  {} as Partial<TypedSupabaseClient> as TypedSupabaseClient;
const acquireLock = vi.fn<typeof Lock.acquireLock>();
const releaseLock = vi.fn<typeof Lock.releaseLock>();
const mockCascadeVideosFromTalents =
  vi.fn<typeof CascadeFromTalents.cascadeVideosFromTalents>();
const mockRevalidateTags = vi.fn<typeof WebCache.revalidateTags>();

vi.mock(import("@/lib/supabase"), () => ({
  supabaseClient: mockSupabaseClient,
}));

vi.mock(import("@/lib/lock"), () => ({ acquireLock, releaseLock }));

vi.mock(import("./_lib/cascade-from-talents"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    cascadeVideosFromTalents: mockCascadeVideosFromTalents,
  };
});

vi.mock(import("@shinju-date/web-cache"), () => ({
  revalidateTags: mockRevalidateTags,
}));

vi.mock(import("@shinju-date/logger"), () => ({
  logger: createLoggerMock(),
}));

vi.mock(import("@sentry/nextjs"), () => ({
  captureCheckIn: vi.fn<typeof Sentry.captureCheckIn>(() => "mock-check-in-id"),
  captureException: vi.fn<typeof Sentry.captureException>(),
  flush: vi.fn<typeof Sentry.flush>(),
}));

vi.mock(import("next/server"), () => ({ after: createAfterMock() }));

describe("POST /videos/cascade-from-talents", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    const module = await import("./route");
    POST = module.POST;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns cascade result and revalidates when work was done", async () => {
    acquireLock.mockResolvedValue("lock-value");
    mockCascadeVideosFromTalents.mockResolvedValue({
      restored: 3,
      softDeleted: 5,
    });
    mockRevalidateTags.mockResolvedValue(undefined);

    const request = new Request(
      "http://localhost:5000/videos/cascade-from-talents",
      { method: "POST" }
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({
      restored: 3,
      softDeleted: 5,
    });
    expect(mockCascadeVideosFromTalents).toHaveBeenCalledWith(
      mockSupabaseClient
    );
    expect(mockRevalidateTags).toHaveBeenCalledWith(["videos", "talents"], {
      signal: request.signal,
    });
  });

  it("skips revalidation when nothing changed", async () => {
    acquireLock.mockResolvedValue("lock-value");
    mockCascadeVideosFromTalents.mockResolvedValue({
      restored: 0,
      softDeleted: 0,
    });

    const request = new Request(
      "http://localhost:5000/videos/cascade-from-talents",
      { method: "POST" }
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockRevalidateTags).not.toHaveBeenCalled();
  });

  it("returns 429 while the previous run is still running", async () => {
    acquireLock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:5000/videos/cascade-from-talents", {
        method: "POST",
      })
    );

    expect(response.status).toBe(429);
    expect(mockCascadeVideosFromTalents).not.toHaveBeenCalled();
  });

  it("returns 500 when cascade fails", async () => {
    const Sentry = await import("@sentry/nextjs");
    const error = new Error("boom");

    acquireLock.mockResolvedValue("lock-value");
    mockCascadeVideosFromTalents.mockRejectedValue(error);

    const response = await POST(
      new Request("http://localhost:5000/videos/cascade-from-talents", {
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    expect(mockRevalidateTags).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(Sentry.captureCheckIn).toHaveBeenLastCalledWith({
      checkInId: "mock-check-in-id",
      monitorSlug: "/videos/cascade-from-talents",
      status: "error",
    });
  });

  it("returns 500 even when the revalidation after a partial failure fails", async () => {
    const { CascadePhaseError } = await import("./_lib/cascade-from-talents");
    const Sentry = await import("@sentry/nextjs");
    const error = new CascadePhaseError("partial failure", {
      restored: 2,
      softDeleted: 0,
    });

    acquireLock.mockResolvedValue("lock-value");
    mockCascadeVideosFromTalents.mockRejectedValue(error);
    mockRevalidateTags.mockRejectedValue(new Error("web is down"));

    const response = await POST(
      new Request("http://localhost:5000/videos/cascade-from-talents", {
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(Sentry.captureCheckIn).toHaveBeenLastCalledWith({
      checkInId: "mock-check-in-id",
      monitorSlug: "/videos/cascade-from-talents",
      status: "error",
    });
  });

  it("revalidates and logs partial counts when CascadePhaseError is thrown", async () => {
    const { CascadePhaseError } = await import("./_lib/cascade-from-talents");
    const { logger } = await import("@shinju-date/logger");

    acquireLock.mockResolvedValue("lock-value");
    mockCascadeVideosFromTalents.mockRejectedValue(
      new CascadePhaseError("partial failure", {
        restored: 0,
        softDeleted: 3,
      })
    );
    mockRevalidateTags.mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost:5000/videos/cascade-from-talents", {
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    expect(mockRevalidateTags).toHaveBeenCalledWith(["videos", "talents"], {
      signal: expect.any(AbortSignal),
    });
    expect(logger.error).toHaveBeenCalledWith(
      "タレント連鎖の動画処理でフェーズ失敗がありました",
      expect.objectContaining({
        restored: 0,
        softDeleted: 3,
      })
    );
  });
});
