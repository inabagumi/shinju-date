import type {
  ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import type { AppRouter } from "@/test/next-navigation";

import { videoSearchParamsSchema } from "./search-params-schema";

// Mock Next.js navigation hooks
const mockPush = vi.fn<AppRouter["push"]>();
const mockUseRouter = vi.fn<typeof useRouter>(
  () => ({ push: mockPush }) as Partial<AppRouter> as AppRouter
);
const mockUseSearchParams = vi.fn<typeof useSearchParams>();
const mockUsePathname = vi.fn<typeof usePathname>(() => "/videos");

vi.mock(import("next/navigation"), () => ({
  usePathname: mockUsePathname,
  useRouter: mockUseRouter,
  useSearchParams: mockUseSearchParams,
}));

describe("Pagination URL Generation Logic", () => {
  it("should preserve all query parameters when changing page", () => {
    // Mock current search params with filters applied
    const currentParams = new URLSearchParams({
      deleted: "false",
      page: "2",
      search: "test video",
      sortField: "published_at",
      sortOrder: "asc",
      talentId: "123",
      visible: "true",
    });

    mockUseSearchParams.mockReturnValue(
      currentParams as ReadonlyURLSearchParams
    );

    // Simulate creating a URL for page 3
    const newParams = new URLSearchParams(currentParams.toString());
    newParams.set("page", "3");
    const expectedUrl = `/videos?${newParams.toString()}`;

    // Every parameter is kept in its place, and only the page changes
    expect(expectedUrl).toBe(
      "/videos?deleted=false&page=3&search=test+video&sortField=published_at&sortOrder=asc&talentId=123&visible=true"
    );
  });

  it("should work with minimal parameters", () => {
    const currentParams = new URLSearchParams({ page: "1" });
    mockUseSearchParams.mockReturnValue(
      currentParams as ReadonlyURLSearchParams
    );

    const newParams = new URLSearchParams(currentParams.toString());
    newParams.set("page", "2");
    const expectedUrl = `/videos?${newParams.toString()}`;

    expect(expectedUrl).toBe("/videos?page=2");
  });

  it("should handle complex filter combinations", () => {
    const currentParams = new URLSearchParams({
      page: "5",
      search: "anime music",
      sortField: "updated_at",
      talentId: "456",
      visible: "false",
    });

    mockUseSearchParams.mockReturnValue(
      currentParams as ReadonlyURLSearchParams
    );

    // Test going to previous page
    const newParams = new URLSearchParams(currentParams.toString());
    newParams.set("page", "4");
    const expectedUrl = `/videos?${newParams.toString()}`;

    // Every parameter is kept in its place, and only the page changes
    expect(expectedUrl).toBe(
      "/videos?page=4&search=anime+music&sortField=updated_at&talentId=456&visible=false"
    );
  });
});

describe("Integration: Schema + Pagination Logic", () => {
  it("should handle URL parameters that come from actual pagination", () => {
    // This simulates what would happen when a user clicks a pagination link
    const urlParams = {
      page: "3",
      search: "test",
      sortField: "published_at",
      sortOrder: "desc",
      talentId: "dee90561-a010-48a5-88fa-cde39be9a94a",
      visible: "true",
    };

    // Parse with our schema
    const validated = videoSearchParamsSchema.parse(urlParams);

    expect(validated).toStrictEqual({
      page: 3,
      search: "test",
      sortField: "published_at",
      sortOrder: "desc",
      talentId: ["dee90561-a010-48a5-88fa-cde39be9a94a"],
      visible: [true],
    });
  });
});
