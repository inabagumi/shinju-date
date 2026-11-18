import { TIME_ZONE } from "@shinju-date/constants";
import { logger } from "@shinju-date/logger";
import { NextRequest } from "next/server";
import type { connection } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCsvExportRoute } from "./create-csv-export-route";

vi.mock(import("next/server"), async (importOriginal) => ({
  ...(await importOriginal()),
  connection: vi.fn<typeof connection>(async () => {}),
}));

vi.mock(import("@shinju-date/logger"), async () => {
  const { createMockLogger } = await import("@/test/logger");

  return { logger: createMockLogger() };
});

interface Item {
  name: string;
  count: number;
}

const fetchItems = vi.fn<(query: unknown) => Promise<Item[]>>();

const GET = createCsvExportRoute({
  fetch: fetchItems,
  filenamePrefix: "test-export-",
  header: ["順位", "名前", "回数"],
  toRow: (item, index) => [index + 1, item.name, item.count],
});

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/export/test?${query}`);
}

describe(createCsvExportRoute, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
      Temporal.ZonedDateTime.from(`2026-11-14T12:00:00[${TIME_ZONE}]`)
    );
    fetchItems.mockResolvedValue([
      { count: 10, name: "あ" },
      { count: 5, name: "い" },
    ]);
  });

  it("passes the range and the limit to the fetch function", async () => {
    await GET(request("from=2026-11-01&to=2026-11-10&limit=5"));

    expect(fetchItems).toHaveBeenCalledWith({
      limit: 5,
      range: { end: "2026-11-10", start: "2026-11-01" },
    });
  });

  it("writes the header and the rows as a CSV with a BOM", async () => {
    const response = await GET(request("from=2026-11-01&to=2026-11-10"));
    const body = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv;charset=utf-8");
    expect(Array.from(body.slice(0, 3))).toStrictEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(body)).toBe(
      "順位,名前,回数\n1,あ,10\n2,い,5\n"
    );
  });

  it.each([
    ["a range", "from=2026-11-01&to=2026-11-10", "2026-11-01_2026-11-10"],
    [
      "a range of one day",
      "from=2026-11-10&to=2026-11-10",
      "2026-11-10_2026-11-10",
    ],
    ["date", "date=2026-11-05", "2026-11-05"],
    ["only from", "from=2026-11-03", "2026-11-03"],
    ["only to", "to=2026-11-03", "2026-11-03"],
  ])("names the file after the date of %s", async (_, query, date) => {
    const response = await GET(request(query));

    expect(response.headers.get("Content-Disposition")).toBe(
      `attachment; filename="test-export-${date}.csv"`
    );
  });

  it.each([
    ["from outside the window", "from=2026-08-16&to=2026-11-10"],
    ["only from outside the window", "from=2026-08-16"],
    ["to after today", "from=2026-11-01&to=2026-11-15"],
    ["date after today", "date=2026-11-15"],
    ["a start after the end", "from=2026-11-10&to=2026-11-03"],
    ["a range longer than 90 days", "from=2026-08-01&to=2026-11-14"],
    ["a date that is not YYYY-MM-DD", "date=20261110"],
    ["no date", "limit=10"],
  ])("responds with 400 for %s", async (_, query) => {
    const response = await GET(request(query));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid parameters provided",
    });
    expect(fetchItems).not.toHaveBeenCalled();
  });

  it("responds with 404 when there is no data", async () => {
    fetchItems.mockResolvedValue([]);

    const response = await GET(request("date=2026-11-05"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toStrictEqual({
      error: "No data available for the specified date range",
    });
  });

  it("logs the error and responds with 500 when the fetch fails", async () => {
    const error = new Error("Redis is down");
    fetchItems.mockRejectedValue(error);

    const response = await GET(request("date=2026-11-05"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toStrictEqual({
      error: "Failed to generate CSV export",
    });
    expect(logger.error).toHaveBeenCalledWith(
      "CSV のエクスポートに失敗しました",
      expect.objectContaining({ error, filenamePrefix: "test-export-" })
    );
  });
});
