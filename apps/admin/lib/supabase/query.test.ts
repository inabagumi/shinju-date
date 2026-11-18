import { logger } from "@shinju-date/logger";
import type { PostgrestError } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  INVALID_TEXT_REPRESENTATION_ERROR_CODE,
  isNotFoundError,
  NO_ROWS_ERROR_CODE,
  QueryError,
  unwrap,
  unwrapCount,
  unwrapOrNull,
} from "./query";

vi.mock("@shinju-date/logger", () => ({
  logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function postgrestError(code: string, message = "Query failed") {
  return { code, details: "", hint: "", message } as PostgrestError;
}

const noRows = postgrestError(NO_ROWS_ERROR_CODE, "The result contains 0 rows");
const invalidId = postgrestError(
  INVALID_TEXT_REPRESENTATION_ERROR_CODE,
  'invalid input syntax for type uuid: "a"'
);
const connectionError = postgrestError(
  "PGRST000",
  "Could not connect to the database"
);

afterEach(() => {
  vi.clearAllMocks();
});

describe("isNotFoundError", () => {
  it("should be true when no row matches", () => {
    expect(isNotFoundError(noRows)).toBe(true);
  });

  it("should be true when the ID is not in the form of a UUID", () => {
    expect(isNotFoundError(invalidId)).toBe(true);
  });

  it("should be false for other errors", () => {
    expect(isNotFoundError(connectionError)).toBe(false);
  });

  it("should be false without an error", () => {
    expect(isNotFoundError(null)).toBe(false);
    expect(isNotFoundError(undefined)).toBe(false);
  });
});

describe("QueryError", () => {
  it("should name the operation and keep the Supabase error", () => {
    const error = new QueryError("getVideo", connectionError);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("QueryError");
    expect(error.message).toBe("getVideo: Could not connect to the database");
    expect(error.operation).toBe("getVideo");
    expect(error.code).toBe("PGRST000");
    expect(error.cause).toBe(connectionError);
  });
});

describe("unwrap", () => {
  it("should return the data", () => {
    expect(unwrap({ data: [{ id: 1 }], error: null }, "getItems")).toEqual([
      { id: 1 },
    ]);
  });

  it("should throw a QueryError and log the operation when the query fails", () => {
    expect(() =>
      unwrap({ data: null, error: connectionError }, "getItems")
    ).toThrow(
      expect.objectContaining({
        cause: connectionError,
        name: "QueryError",
        operation: "getItems",
      })
    );
    expect(logger.error).toHaveBeenCalledWith(
      "データの取得に失敗しました",
      expect.objectContaining({ code: "PGRST000", operation: "getItems" })
    );
  });

  it("should throw even when the row was not found", () => {
    expect(() => unwrap({ data: null, error: noRows }, "getItem")).toThrow(
      QueryError
    );
  });
});

describe("unwrapOrNull", () => {
  it("should return the data", () => {
    expect(unwrapOrNull({ data: { id: 1 }, error: null }, "getItem")).toEqual({
      id: 1,
    });
  });

  it("should return null when no row matches", () => {
    expect(unwrapOrNull({ data: null, error: noRows }, "getItem")).toBeNull();
  });

  it("should return null when the ID is not in the form of a UUID", () => {
    expect(
      unwrapOrNull({ data: null, error: invalidId }, "getItem")
    ).toBeNull();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("should throw a QueryError for other errors", () => {
    expect(() =>
      unwrapOrNull({ data: null, error: connectionError }, "getItem")
    ).toThrow(QueryError);
  });
});

describe("unwrapCount", () => {
  it("should return the count", () => {
    expect(unwrapCount({ count: 3, error: null }, "countItems")).toBe(3);
  });

  it("should return 0 without a count", () => {
    expect(unwrapCount({ count: null, error: null }, "countItems")).toBe(0);
  });

  it("should throw a QueryError when the query fails", () => {
    expect(() =>
      unwrapCount({ count: null, error: connectionError }, "countItems")
    ).toThrow(QueryError);
  });
});
