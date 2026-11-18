import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  // `lib/env.ts` reads the variables when the module is imported.
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://shinju.date");
});

import { GET } from "./route";

describe("GET /opensearch.xml", () => {
  it("uses the search results path that needs no redirect", async () => {
    const body = await GET().text();

    expect(body).toContain(
      'template="https://shinju.date/videos/{searchTerms}"'
    );
  });
});
