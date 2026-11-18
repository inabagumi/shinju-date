import { describe, expect, test } from "vitest";

import { getLegacySearchRedirectPath } from "./search-redirect";

function getPath(path: string): string | undefined {
  return getLegacySearchRedirectPath(new URL(path, "https://shinju.date"));
}

describe("getLegacySearchRedirectPath", () => {
  test("redirects a query to the search results", () => {
    expect(getPath("/search?q=歌枠")).toBe(
      `/videos/${encodeURIComponent("歌枠")}`
    );
    expect(getPath("/videos?q=歌枠")).toBe(
      `/videos/${encodeURIComponent("歌枠")}`
    );
  });

  test("joins multiple queries with a space for both entry points", () => {
    const expected = `/videos/${encodeURIComponent("a b")}`;

    expect(getPath("/search?q=a&q=b")).toBe(expected);
    expect(getPath("/videos?q=a&q=b")).toBe(expected);
  });

  test("ignores blank queries", () => {
    expect(getPath("/search")).toBe("/videos");
    expect(getPath("/search?q=")).toBe("/videos");
    expect(getPath("/videos?q=%20")).toBe("/videos");
    expect(getPath("/search?q=%20a%20&q=&q=b")).toBe(
      `/videos/${encodeURIComponent("a b")}`
    );
  });

  test("keeps the kind and talent filters", () => {
    const talentA = "00000000-0000-4000-8000-000000000001";
    const talentB = "00000000-0000-4000-8000-000000000002";

    expect(
      getPath(`/videos?q=歌&kind=short&talent=${talentB}&talent=${talentA}`)
    ).toBe(
      `/videos/${encodeURIComponent("歌")}?kind=short&talent=${talentA}&talent=${talentB}`
    );
  });

  test("does not redirect other URLs", () => {
    expect(getPath("/videos")).toBeUndefined();
    expect(getPath("/videos?kind=short")).toBeUndefined();
    expect(getPath("/videos/test?q=a")).toBeUndefined();
    expect(getPath("/?q=a")).toBeUndefined();
  });
});
