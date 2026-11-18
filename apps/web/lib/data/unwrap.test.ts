import type { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { DataFetchError, unwrap } from "./unwrap";

const ERROR = {
  code: "57014",
  details: "",
  hint: "",
  message: "canceling statement due to statement timeout",
  name: "PostgrestError",
} as PostgrestError;

// The result of a failed query, as Supabase returns it
const FAILED = { data: null, error: ERROR };

describe("unwrap", () => {
  it("returns the data of a successful query", () => {
    expect(
      unwrap({ data: [{ id: "video-1" }], error: null }, "fetchVideos")
    ).toEqual([{ id: "video-1" }]);
  });

  it("returns null data of a successful query as is", () => {
    expect(unwrap({ data: null, error: null }, "fetchTalent")).toBeNull();
  });

  it("throws a DataFetchError named after the operation", () => {
    expect(() => unwrap(FAILED, "fetchVideos")).toThrow(
      expect.objectContaining({
        cause: ERROR,
        message: "fetchVideos: canceling statement due to statement timeout",
        name: "DataFetchError",
        operation: "fetchVideos",
      })
    );
  });

  it("throws an instance of DataFetchError", () => {
    expect(() => unwrap(FAILED, "fetchVideos")).toThrow(DataFetchError);
  });
});
