import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@/lib/data/talents"), () => ({
  fetchActiveTalents: vi.fn<typeof fetchActiveTalents>(),
}));

import { fetchActiveTalents } from "@/lib/data/talents";

import sitemap from "./sitemap";

const TALENT_IDS = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
];

describe(sitemap, () => {
  beforeEach(() => {
    vi.mocked(fetchActiveTalents).mockResolvedValue([
      { id: TALENT_IDS[0] as string, name: "朝霧ミオ" },
      { id: TALENT_IDS[1] as string, name: "夜宵ルナ" },
    ]);
  });

  it("should include the list of talents and the active talents", async () => {
    const urls = (await sitemap()).map((item) => new URL(item.url).pathname);

    expect(urls).toContain("/talents");
    expect(urls).toContain(`/talents/${TALENT_IDS[0]}`);
    expect(urls).toContain(`/talents/${TALENT_IDS[1]}`);
  });

  it("should include only the schedule of the current week", async () => {
    const urls = (await sitemap()).map((item) => new URL(item.url).pathname);

    expect(urls).toContain("/schedule");
    expect(urls.filter((url) => url.startsWith("/schedule/"))).toStrictEqual(
      []
    );
  });

  it("should list only the talents fetchActiveTalents returns", async () => {
    vi.mocked(fetchActiveTalents).mockResolvedValue([]);

    const urls = (await sitemap()).map((item) => new URL(item.url).pathname);

    expect(urls.filter((url) => url.startsWith("/talents/"))).toStrictEqual([]);
  });
});
