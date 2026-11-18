import type { cacheTag } from "next/cache";
import { describe, expect, it, vi } from "vitest";

import type {
  createSupabaseServerClient,
  TypedSupabaseClient,
} from "@/lib/supabase";
import {
  INVALID_TEXT_REPRESENTATION_ERROR_CODE,
  QueryError,
} from "@/lib/supabase/query";
import { postgresError, setupSupabase } from "@/test/supabase";

import { getTalent } from "./get-talent";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn<() => Promise<TypedSupabaseClient>>(),
}));

vi.mock(import("@/lib/supabase"), () => ({
  // Always resolves to the client of the default database
  createSupabaseServerClient:
    mocks.createSupabaseServerClient as typeof createSupabaseServerClient,
}));

vi.mock(import("next/cache"), () => ({
  cacheLife: vi.fn<() => void>(),
  cacheTag: vi.fn<typeof cacheTag>(),
}));

vi.mock(import("@shinju-date/logger"), async () => {
  const { createMockLogger } = await import("@/test/logger");

  return { logger: createMockLogger() };
});

const supabase = setupSupabase();
mocks.createSupabaseServerClient.mockResolvedValue(supabase.client);

const TALENT_ID = "123e4567-e89b-12d3-a456-426614174000";

describe(getTalent, () => {
  it("should return the talent", async () => {
    supabase.on("select", "talents", { id: TALENT_ID, name: "Test Talent" });

    await expect(getTalent(TALENT_ID)).resolves.toMatchObject({
      id: TALENT_ID,
      name: "Test Talent",
    });
    expect(supabase.calls("select", "talents")[0]?.query).toMatchObject({
      id: `eq.${TALENT_ID}`,
    });
  });

  it("should return null when the talent does not exist", async () => {
    await expect(getTalent(TALENT_ID)).resolves.toBeNull();
  });

  it("should return null when the ID is not in the form of a UUID", async () => {
    supabase.on(
      "select",
      "talents",
      postgresError(
        INVALID_TEXT_REPRESENTATION_ERROR_CODE,
        'invalid input syntax for type uuid: "a"'
      )
    );

    await expect(getTalent("a")).resolves.toBeNull();
  });

  it("should throw a QueryError naming the query for other errors", async () => {
    supabase.on(
      "select",
      "talents",
      postgresError("PGRST000", "Database connection error")
    );

    const error = await getTalent(TALENT_ID).catch((error_: unknown) => error_);

    expect(error).toBeInstanceOf(QueryError);
    expect(error).toMatchObject({
      code: "PGRST000",
      message: "getTalent: Database connection error",
      operation: "getTalent",
    });
  });
});
