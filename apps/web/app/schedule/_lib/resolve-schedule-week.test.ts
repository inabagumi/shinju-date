import { notFound } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchOldestVideoDate, fetchScheduleToday } from "@/lib/data/schedule";

import { resolveScheduleWeek } from "./resolve-schedule-week";

vi.mock(import("next/navigation"), () => ({
  notFound: vi.fn<typeof notFound>(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock(import("@/lib/data/schedule"), () => ({
  fetchOldestVideoDate: vi.fn<typeof fetchOldestVideoDate>(),
  fetchScheduleToday: vi.fn<typeof fetchScheduleToday>(),
}));

const params = (date: string) => Promise.resolve({ date });

describe(resolveScheduleWeek, () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Thursday, 12 November 2026
    vi.mocked(fetchScheduleToday).mockResolvedValue("2026-11-12");
    vi.mocked(fetchOldestVideoDate).mockResolvedValue("2026-10-28");
  });

  it("should return the week of today without the date", async () => {
    const { range, today, weekStart } = await resolveScheduleWeek();

    expect(weekStart.toString()).toBe("2026-11-08");
    expect(today.toString()).toBe("2026-11-12");
    expect(range.first.toString()).toBe("2026-10-25");
    expect(range.last.toString()).toBe("2026-12-06");
  });

  it("should return the Sunday of the week of the date", async () => {
    const { weekStart: thursdayWeekStart } = await resolveScheduleWeek(
      params("2026-11-12")
    );
    const { weekStart: sundayWeekStart } = await resolveScheduleWeek(
      params("2026-11-01")
    );

    expect(thursdayWeekStart.toString()).toBe("2026-11-08");
    expect(sundayWeekStart.toString()).toBe("2026-11-01");
  });

  it("should go across the years", async () => {
    vi.mocked(fetchScheduleToday).mockResolvedValue("2026-12-30");

    const { weekStart } = await resolveScheduleWeek(params("2027-01-01"));

    expect(weekStart.toString()).toBe("2026-12-27");
  });

  it.each(["2026-W46", "2026-02-30", "today"])(
    "should render the not-found page for %s without fetching",
    async (value) => {
      await expect(resolveScheduleWeek(params(value))).rejects.toThrow(
        "NEXT_NOT_FOUND"
      );
      expect(notFound).toHaveBeenCalledWith();
      expect(fetchScheduleToday).not.toHaveBeenCalled();
    }
  );

  it("should render the not-found page before the week of the oldest video", async () => {
    // Saturday of the week before the oldest video
    await expect(resolveScheduleWeek(params("2026-10-24"))).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });

  it("should render the not-found page more than 4 weeks ahead", async () => {
    await expect(
      resolveScheduleWeek(params("2026-12-12"))
    ).resolves.toMatchObject({});
    await expect(resolveScheduleWeek(params("2026-12-13"))).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });
});
