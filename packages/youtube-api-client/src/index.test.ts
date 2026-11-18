import { describe, expect, it } from "vitest";

import { YOUTUBE_DATA_API_MAX_RESULTS } from "./index.js";

describe("the max results of the YouTube Data API", () => {
  it("is the most IDs one request accepts", () => {
    expect(YOUTUBE_DATA_API_MAX_RESULTS).toBe(50);
  });
});
