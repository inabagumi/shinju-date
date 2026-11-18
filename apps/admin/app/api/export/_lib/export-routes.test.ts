import { TIME_ZONE } from "@shinju-date/constants";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPopularKeywords } from "@/lib/analytics/get-popular-keywords";
import { getPopularTalents } from "@/lib/analytics/get-popular-talents";
import { getPopularVideos } from "@/lib/analytics/get-popular-videos";
import { getSearchExitRates } from "@/lib/analytics/get-search-quality-metrics";

import { GET as exportKeywords } from "../keywords/route";
import { GET as exportSearchExitRates } from "../search-exit-rates/route";
import { GET as exportTalents } from "../talents/route";
import { GET as exportVideos } from "../videos/route";

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));

vi.mock("@shinju-date/logger", () => ({
  logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/analytics/get-popular-keywords", () => ({
  getPopularKeywords: vi.fn(),
}));
vi.mock("@/lib/analytics/get-popular-talents", () => ({
  getPopularTalents: vi.fn(),
}));
vi.mock("@/lib/analytics/get-popular-videos", () => ({
  getPopularVideos: vi.fn(),
}));
vi.mock("@/lib/analytics/get-search-quality-metrics", () => ({
  getSearchExitRates: vi.fn(),
}));

const BOM = [0xef, 0xbb, 0xbf];

async function exportCsv(
  handler: (request: NextRequest) => Promise<Response>,
  query: string
) {
  const response = await handler(
    new NextRequest(`http://localhost/api/export/any?${query}`)
  );
  const body = new Uint8Array(await response.arrayBuffer());

  return {
    bom: Array.from(body.slice(0, 3)),
    contentDisposition: response.headers.get("Content-Disposition"),
    contentType: response.headers.get("Content-Type"),
    status: response.status,
    text: new TextDecoder().decode(body),
  };
}

describe("CSV export routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
      Temporal.ZonedDateTime.from(`2026-11-14T12:00:00[${TIME_ZONE}]`)
    );
  });

  it("exports the popular keywords", async () => {
    vi.mocked(getPopularKeywords).mockResolvedValue([
      { count: 12, keyword: "ゲーム" },
      { count: 3, keyword: "歌枠, 雑談" },
    ]);

    expect(
      await exportCsv(exportKeywords, "from=2026-11-08&to=2026-11-14")
    ).toEqual({
      bom: BOM,
      contentDisposition:
        'attachment; filename="search-analytics-keywords-2026-11-08_2026-11-14.csv"',
      contentType: "text/csv;charset=utf-8",
      status: 200,
      text: '順位,キーワード,検索回数\n1,ゲーム,12\n2,"歌枠, 雑談",3\n',
    });
    expect(getPopularKeywords).toHaveBeenCalledWith({
      limit: 50,
      range: { end: "2026-11-14", start: "2026-11-08" },
    });
  });

  it("exports the search exit rates", async () => {
    vi.mocked(getSearchExitRates).mockResolvedValue([
      { exitRate: 42.25, keyword: "ゲーム", searchCount: 20 },
      { exitRate: 0, keyword: "歌枠", searchCount: 5 },
    ]);

    expect(await exportCsv(exportSearchExitRates, "date=2026-11-10")).toEqual({
      bom: BOM,
      contentDisposition:
        'attachment; filename="search-exit-rates-2026-11-10.csv"',
      contentType: "text/csv;charset=utf-8",
      status: 200,
      text: "順位,キーワード,検索回数,離脱率\n1,ゲーム,20,42.3%\n2,歌枠,5,0.0%\n",
    });
  });

  it("exports the popular talents", async () => {
    vi.mocked(getPopularTalents).mockResolvedValue([
      { clicks: 30, id: "talent-1", name: "タレントA" },
      { clicks: 8, id: "talent-2", name: "タレントB" },
    ] as Awaited<ReturnType<typeof getPopularTalents>>);

    expect(await exportCsv(exportTalents, "from=2026-11-03")).toEqual({
      bom: BOM,
      contentDisposition:
        'attachment; filename="click-analytics-talent-2026-11-03.csv"',
      contentType: "text/csv;charset=utf-8",
      status: 200,
      text: "順位,タレント名,クリック数\n1,タレントA,30\n2,タレントB,8\n",
    });
  });

  it("exports the popular videos", async () => {
    vi.mocked(getPopularVideos).mockResolvedValue([
      {
        clicks: 15,
        title: "動画A",
        youtube_video: { youtube_video_id: "abc123" },
      },
      { clicks: 2, title: "動画B", youtube_video: null },
    ] as Awaited<ReturnType<typeof getPopularVideos>>);

    expect(
      await exportCsv(exportVideos, "from=2026-11-01&to=2026-11-10&limit=2")
    ).toEqual({
      bom: BOM,
      contentDisposition:
        'attachment; filename="click-analytics-videos-2026-11-01_2026-11-10.csv"',
      contentType: "text/csv;charset=utf-8",
      status: 200,
      text: "順位,タイトル,YouTube動画ID,クリック数\n1,動画A,abc123,15\n2,動画B,N/A,2\n",
    });
    expect(getPopularVideos).toHaveBeenCalledWith({
      limit: 2,
      range: { end: "2026-11-10", start: "2026-11-01" },
    });
  });
});
