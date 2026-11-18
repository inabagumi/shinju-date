import { describe, expect, it, vi } from "vitest";

import type {
  createSupabaseServerClient,
  TypedSupabaseClient,
} from "@/lib/supabase";
import { INVALID_TEXT_REPRESENTATION_ERROR_CODE } from "@/lib/supabase/query";
import { postgresError, setupSupabase } from "@/test/supabase";

import getVideo from "./get-video";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn<() => Promise<TypedSupabaseClient>>(),
}));

vi.mock(import("next/cache"), () => ({
  cacheLife: vi.fn<() => void>(),
}));
vi.mock(import("@/lib/supabase"), () => ({
  // Always resolves to the client of the default database
  createSupabaseServerClient:
    mocks.createSupabaseServerClient as typeof createSupabaseServerClient,
}));

vi.mock(import("@/lib/redis"), async () => {
  const { createMockRedisClient } = await import("@/test/mock-redis-pipeline");
  const redisClient = createMockRedisClient({
    zscore: vi
      .fn<(key: string, member: string) => Promise<number | null>>()
      .mockResolvedValue(2),
  });

  return { getRedisClient: () => redisClient };
});

vi.mock(import("@shinju-date/logger"), async () => {
  const { createMockLogger } = await import("@/test/logger");

  return { logger: createMockLogger() };
});

const supabase = setupSupabase();
mocks.createSupabaseServerClient.mockResolvedValue(supabase.client);

const VIDEO_ID = "123e4567-e89b-12d3-a456-426614174000";

describe(getVideo, () => {
  it("should return the video with its clicks", async () => {
    supabase.on("select", "videos", { id: VIDEO_ID, title: "Test Video" });

    await expect(getVideo(VIDEO_ID)).resolves.toMatchObject({
      clicks: 14,
      id: VIDEO_ID,
      title: "Test Video",
    });
  });

  it("should return null when the video does not exist", async () => {
    await expect(getVideo(VIDEO_ID)).resolves.toBeNull();
  });

  it("should return null when the ID is not in the form of a UUID", async () => {
    supabase.on(
      "select",
      "videos",
      postgresError(
        INVALID_TEXT_REPRESENTATION_ERROR_CODE,
        'invalid input syntax for type uuid: "a"'
      )
    );

    await expect(getVideo("a")).resolves.toBeNull();
  });

  it("should throw a QueryError naming the query for other errors", async () => {
    supabase.on(
      "select",
      "videos",
      postgresError("PGRST000", "Database connection error")
    );

    await expect(getVideo(VIDEO_ID)).rejects.toMatchObject({
      code: "PGRST000",
      message: "getVideo: Database connection error",
      name: "QueryError",
      operation: "getVideo",
    });
  });
});
