import { HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import {
  INVALID_TEXT_REPRESENTATION_ERROR_CODE,
  QueryError,
} from "@/lib/supabase/query";
import { postgresError, setupSupabase } from "@/test/supabase";
import type { FakeSupabase } from "@/test/supabase";

import { getFeatureRequestById, getFeatureRequests } from "./get-feedback";

const state = vi.hoisted(() => ({ supabase: null as FakeSupabase | null }));

vi.mock(import("next/cache"), () => ({
  cacheLife: vi.fn<() => void>(),
}));
vi.mock(import("@/lib/supabase/admin"), () => ({
  getSupabaseAdminClient: () => {
    if (!state.supabase) {
      throw new Error("The fake Supabase is not set up.");
    }

    return state.supabase.client;
  },
}));

vi.mock(import("@shinju-date/logger"), async () => {
  const { createMockLogger } = await import("@/test/logger");

  return { logger: createMockLogger() };
});

const supabase = setupSupabase();
state.supabase = supabase;

const FEEDBACK_ID = "123e4567-e89b-12d3-a456-426614174000";

describe(getFeatureRequests, () => {
  it("should return the feature requests", async () => {
    supabase.on("select", "feature_requests", [{ id: FEEDBACK_ID }]);

    await expect(getFeatureRequests()).resolves.toStrictEqual([
      { id: FEEDBACK_ID },
    ]);
  });

  it("should return an empty list for a response without a body", async () => {
    supabase.on(
      "select",
      "feature_requests",
      new HttpResponse(null, { status: 404 })
    );

    await expect(getFeatureRequests()).resolves.toStrictEqual([]);
  });

  it("should throw a QueryError naming the query when it fails", async () => {
    supabase.on(
      "select",
      "feature_requests",
      postgresError("PGRST000", "Database connection error")
    );

    await expect(getFeatureRequests()).rejects.toBeInstanceOf(QueryError);
  });
});

describe(getFeatureRequestById, () => {
  it("should return the feature request", async () => {
    supabase.on("select", "feature_requests", { id: FEEDBACK_ID });

    await expect(getFeatureRequestById(FEEDBACK_ID)).resolves.toStrictEqual({
      id: FEEDBACK_ID,
    });
  });

  it("should return null when the feature request does not exist", async () => {
    await expect(getFeatureRequestById(FEEDBACK_ID)).resolves.toBeNull();
  });

  it("should return null when the ID is not in the form of a UUID", async () => {
    supabase.on(
      "select",
      "feature_requests",
      postgresError(
        INVALID_TEXT_REPRESENTATION_ERROR_CODE,
        'invalid input syntax for type uuid: "a"'
      )
    );

    await expect(getFeatureRequestById("a")).resolves.toBeNull();
  });

  it("should throw a QueryError naming the query for other errors", async () => {
    supabase.on(
      "select",
      "feature_requests",
      postgresError("PGRST000", "Database connection error")
    );

    await expect(getFeatureRequestById(FEEDBACK_ID)).rejects.toMatchObject({
      name: "QueryError",
      operation: "getFeatureRequestById",
    });
  });
});
