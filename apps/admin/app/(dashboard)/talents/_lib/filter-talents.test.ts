import { describe, expect, it } from "vitest";

import { filterTalents } from "./filter-talents";
import type { TalentSearchParams } from "./search-params-schema";

function createTalent(
  id: string,
  name: string,
  updatedAt: string,
  overrides: { deleted_at?: string | null; status?: string } = {}
) {
  return {
    deleted_at: null,
    id,
    name,
    status: "active",
    updated_at: updatedAt,
    ...overrides,
  };
}

const TALENTS = [
  createTalent("id-active", "アクティブ", "2025-01-02T00:00:00Z"),
  createTalent("id-retired", "引退", "2025-01-03T00:00:00Z", {
    status: "retired",
  }),
  createTalent("id-deleted", "削除済み", "2025-01-01T00:00:00Z", {
    deleted_at: "2025-01-04T00:00:00Z",
  }),
];

const DEFAULT_FILTERS: TalentSearchParams = {
  search: undefined,
  sort: "desc",
  status: "not_deleted",
};

function ids(filters: Partial<TalentSearchParams>) {
  return filterTalents(TALENTS, { ...DEFAULT_FILTERS, ...filters }).map(
    (talent) => talent.id
  );
}

describe("filterTalents", () => {
  it("excludes the deleted talents and sorts by the last update, newest first, by default", () => {
    expect(ids({})).toEqual(["id-retired", "id-active"]);
  });

  it("sorts by the last update, oldest first", () => {
    expect(ids({ sort: "asc", status: "all" })).toEqual([
      "id-deleted",
      "id-active",
      "id-retired",
    ]);
  });

  it.each([
    ["active", ["id-active"]],
    ["retired", ["id-retired"]],
    ["deleted", ["id-deleted"]],
    ["all", ["id-retired", "id-active", "id-deleted"]],
  ] as const)("filters by the status %s", (status, expected) => {
    expect(ids({ status })).toEqual(expected);
  });

  it("searches the name and the ID, ignoring the case", () => {
    expect(ids({ search: "引退" })).toEqual(["id-retired"]);
    expect(ids({ search: "ID-ACTIVE" })).toEqual(["id-active"]);
    expect(ids({ search: "none" })).toEqual([]);
  });

  it("does not change the given list", () => {
    const talents = [...TALENTS];

    filterTalents(talents, { ...DEFAULT_FILTERS, status: "all" });

    expect(talents).toEqual(TALENTS);
  });
});
