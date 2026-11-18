"use client";

import { formatDate } from "@shinju-date/temporal-fns";
import { Button, Input } from "@shinju-date/ui";
import { useState } from "react";

import {
  getEarliestDate,
  getToday,
  MAX_RANGE_DAYS,
  parseDateFormat,
  validateDate,
  validateRange,
} from "@/lib/analytics/date-window";

import { formatDateRange } from "../_lib/format-date";

export interface DateRange {
  startDate: string; // ISO 8601 date string
  endDate: string; // ISO 8601 date string
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function isSameRange(a: DateRange, b: DateRange): boolean {
  return a.startDate === b.startDate && a.endDate === b.endDate;
}

export default function DateRangePicker({
  value,
  onChange,
}: DateRangePickerProps) {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customStart, setCustomStart] = useState(value.startDate);
  const [customEnd, setCustomEnd] = useState(value.endDate);
  const [validationError, setValidationError] = useState("");

  const today = getToday();
  const maxStartDate = getEarliestDate(today); // Allow up to 90 days ago

  const presets = [
    {
      getValue: () => ({
        endDate: today.toString(),
        startDate: today.subtract({ days: 6 }).toString(),
      }),
      label: "過去7日間",
    },
    {
      getValue: () => ({
        endDate: today.toString(),
        startDate: today.subtract({ days: 29 }).toString(),
      }),
      label: "過去30日間",
    },
    {
      getValue: () => ({
        endDate: today.toString(),
        startDate: today.subtract({ days: 89 }).toString(),
      }),
      label: "過去90日間",
    },
    {
      getValue: () => {
        const firstDay = today.with({ day: 1 });
        return {
          endDate: today.toString(),
          startDate: firstDay.toString(),
        };
      },
      label: "今月",
    },
    {
      getValue: () => {
        const lastMonth = today.subtract({ months: 1 });
        const firstDay = lastMonth.with({ day: 1 });
        const lastDay = firstDay.add({ months: 1 }).subtract({ days: 1 });
        return {
          endDate: lastDay.toString(),
          startDate: firstDay.toString(),
        };
      },
      label: "先月",
    },
  ];

  // Resolve the range a preset applies, clamped to the 90-day limit
  const resolvePresetRange = (preset: (typeof presets)[number]): DateRange => {
    const range = preset.getValue();

    const endDate = Temporal.PlainDate.from(range.endDate);
    let startDate = Temporal.PlainDate.from(range.startDate);

    // If preset exceeds 90 days, adjust the start date
    const earliestStartDate = endDate.subtract({ days: MAX_RANGE_DAYS - 1 });
    if (Temporal.PlainDate.compare(startDate, earliestStartDate) < 0) {
      startDate = earliestStartDate;
    }

    // Ensure start date is not beyond the 90-day limit
    if (Temporal.PlainDate.compare(startDate, maxStartDate) < 0) {
      startDate = maxStartDate;
    }

    return { endDate: range.endDate, startDate: startDate.toString() };
  };

  // A range that matches none of the presets was chosen as a custom period
  const isCustomRange = !presets.some((preset) =>
    isSameRange(resolvePresetRange(preset), value)
  );

  const handlePresetClick = (preset: (typeof presets)[number]) => {
    onChange(resolvePresetRange(preset));
    setIsCustomMode(false);
  };

  const handleCustomOpen = () => {
    // Start editing from the period currently shown
    setCustomStart(value.startDate);
    setCustomEnd(value.endDate);
    setIsCustomMode(true);
  };

  const handleCustomApply = () => {
    // An `<input type="date">` gives an empty string once its value is cleared
    const startDate = parseDateFormat(customStart);
    if (!startDate) {
      setValidationError("開始日を入力してください");
      return;
    }

    const endDate = parseDateFormat(customEnd);
    if (!endDate) {
      setValidationError("終了日を入力してください");
      return;
    }

    const rangeError = validateRange(startDate, endDate);

    // Validate date range
    if (rangeError === "reversed") {
      setValidationError("開始日は終了日より前である必要があります");
      return;
    }

    // Validate maximum period constraint
    if (rangeError === "too-long") {
      setValidationError(`期間は最大${MAX_RANGE_DAYS}日間まで選択できます`);
      return;
    }

    // Validate that start date is not too far in the past
    if (validateDate(startDate, today) === "too-old") {
      setValidationError(
        `開始日は${formatDate(maxStartDate)}以降である必要があります`
      );
      return;
    }

    // Validate that end date is not in the future
    if (validateDate(endDate, today) === "future") {
      setValidationError("終了日は今日以降にできません");
      return;
    }

    setValidationError("");
    onChange({
      endDate: customEnd,
      startDate: customStart,
    });
    setIsCustomMode(false);
  };

  const handleCustomStartChange = (value: string) => {
    setCustomStart(value);
    setValidationError("");
  };

  const handleCustomEndChange = (value: string) => {
    setCustomEnd(value);
    setValidationError("");
  };

  return (
    <div className="rounded-container border border-border bg-surface p-4">
      <h2 className="mb-3 text-meta font-semibold">期間選択</h2>

      {!isCustomMode ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const isSelected = isSameRange(resolvePresetRange(preset), value);

              return (
                <Button
                  aria-pressed={isSelected}
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  size="sm"
                  variant={isSelected ? "primary" : "secondary"}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
          <Button
            aria-pressed={isCustomRange}
            className="w-full"
            onClick={handleCustomOpen}
            size="sm"
            variant={isCustomRange ? "primary" : "secondary"}
          >
            カスタム期間を選択
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1 block text-caption font-semibold"
                htmlFor="start-date"
              >
                開始日
              </label>
              <Input
                id="start-date"
                inputSize="sm"
                max={today.toString()}
                min={maxStartDate.toString()}
                onChange={(e) => handleCustomStartChange(e.target.value)}
                type="date"
                value={customStart}
                variant={validationError ? "danger" : "default"}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-caption font-semibold"
                htmlFor="end-date"
              >
                終了日
              </label>
              <Input
                id="end-date"
                inputSize="sm"
                max={today.toString()}
                onChange={(e) => handleCustomEndChange(e.target.value)}
                type="date"
                value={customEnd}
                variant={validationError ? "danger" : "default"}
              />
            </div>
          </div>
          {validationError && (
            <p
              className="rounded-control bg-danger/10 px-3 py-2 text-caption text-danger"
              role="alert"
            >
              {validationError}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                setIsCustomMode(false);
                setValidationError("");
              }}
              size="sm"
              variant="secondary"
            >
              キャンセル
            </Button>
            <Button className="flex-1" onClick={handleCustomApply} size="sm">
              適用
            </Button>
          </div>
        </div>
      )}

      <p className="mt-3 text-caption text-muted">
        現在の期間:{" "}
        <span className="tabular-nums">{formatDateRange(value)}</span>
        <br />
        最大90日間まで選択可能です
      </p>
    </div>
  );
}
