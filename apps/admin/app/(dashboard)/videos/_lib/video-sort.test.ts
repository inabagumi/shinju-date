import { describe, expect, it } from "vitest";

import { getVideoSortHref, toAriaSort } from "./video-sort";

describe(getVideoSortHref, () => {
  it("reverses the order for the current field", () => {
    expect(
      getVideoSortHref(
        "sortOrder=desc",
        { field: "updated_at", order: "desc" },
        "updated_at"
      )
    ).toBe("/videos?sortOrder=asc");
  });

  it("sorts another field in descending order", () => {
    expect(
      getVideoSortHref(
        "sortField=updated_at&sortOrder=asc",
        { field: "updated_at", order: "asc" },
        "published_at"
      )
    ).toBe("/videos?sortField=published_at&sortOrder=desc");
  });

  it("keeps the filters and goes back to the first page", () => {
    expect(
      getVideoSortHref(
        "page=3&search=test&status=LIVE&status=ENDED",
        { field: "updated_at", order: "desc" },
        "published_at"
      )
    ).toBe(
      "/videos?search=test&status=LIVE&status=ENDED&sortField=published_at&sortOrder=desc"
    );
  });
});

describe(toAriaSort, () => {
  it("maps the order to the value of aria-sort", () => {
    expect(toAriaSort("asc")).toBe("ascending");
    expect(toAriaSort("desc")).toBe("descending");
  });
});
