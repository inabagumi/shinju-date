import { describe, expect, it } from "vitest";

import { filterFeatureRequests } from "./filter-feature-requests";

const FEATURE_REQUESTS = [
  { id: "pending-unread", is_read: false, status: "pending" },
  { id: "pending-read", is_read: true, status: "pending" },
  { id: "resolved-read", is_read: true, status: "resolved" },
] as const;

const ids = (filters: Parameters<typeof filterFeatureRequests>[1]) =>
  filterFeatureRequests(FEATURE_REQUESTS, filters).map((item) => item.id);

describe(filterFeatureRequests, () => {
  it("keeps every feature request without filters", () => {
    expect(ids({ read: undefined, status: undefined })).toStrictEqual([
      "pending-unread",
      "pending-read",
      "resolved-read",
    ]);
  });

  it("filters by the status", () => {
    expect(ids({ read: undefined, status: "pending" })).toStrictEqual([
      "pending-unread",
      "pending-read",
    ]);
    expect(ids({ read: undefined, status: "rejected" })).toStrictEqual([]);
  });

  it("filters by whether it is read", () => {
    expect(ids({ read: "read", status: undefined })).toStrictEqual([
      "pending-read",
      "resolved-read",
    ]);
    expect(ids({ read: "unread", status: undefined })).toStrictEqual([
      "pending-unread",
    ]);
  });

  it("combines the filters", () => {
    expect(ids({ read: "read", status: "pending" })).toStrictEqual([
      "pending-read",
    ]);
  });
});
