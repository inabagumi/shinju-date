"use client";

import type { Tables } from "@shinju-date/database";
import { range } from "@shinju-date/helpers";
import { FilterBar, MultiSelect } from "@shinju-date/ui";
import type { MultiSelectOption } from "@shinju-date/ui";
import { useSearchParams } from "next/navigation";

import { SearchInput } from "@/components/search-input";
import { FieldSkeleton, FilterBarSkeleton } from "@/components/table-skeleton";
import { useUpdateSearchParams } from "@/lib/use-update-search-params";

type Talent = Pick<
  Tables<"talents">,
  "id" | "name" | "created_at" | "updated_at"
>;

type FilterKey =
  | "deleted"
  | "talentId"
  | "visible"
  | "status"
  | "platform"
  | "videoKind";

interface FilterField {
  key: FilterKey;
  label: string;
  options: MultiSelectOption[];
  placeholder: string;
  value: string[];
}

interface Props {
  talents: Talent[];
}

export function VideoFilters({ talents }: Props) {
  const updateSearchParams = useUpdateSearchParams();
  const searchParams = useSearchParams();

  // Get current filter values from URL (support arrays)
  const currentTalentIds = searchParams.getAll("talentId");
  const currentDeleted = searchParams.getAll("deleted");
  const currentVisible = searchParams.getAll("visible");
  const currentStatus = searchParams.getAll("status");
  const currentPlatform = searchParams.getAll("platform");
  const currentVideoKind = searchParams.getAll("videoKind");

  // Removes `page` so that the results start from page 1
  const handleMultiSelectChange = (key: FilterKey, values: string[]) => {
    updateSearchParams({ [key]: values });
  };

  // Define options for each filter
  const talentOptions: MultiSelectOption[] = talents.map((talent) => ({
    label: talent.name,
    value: talent.id,
  }));

  const visibilityOptions: MultiSelectOption[] = [
    { label: "表示中", value: "true" },
    { label: "非表示", value: "false" },
  ];

  const statusOptions: MultiSelectOption[] = [
    { label: "待機中", value: "UPCOMING" },
    { label: "配信中", value: "LIVE" },
    { label: "配信済み", value: "ENDED" },
    { label: "公開済み", value: "PUBLISHED" },
  ];

  const platformOptions: MultiSelectOption[] = [
    { label: "YouTube", value: "youtube" },
    { label: "Twitch", value: "twitch" },
  ];

  const deletedOptions: MultiSelectOption[] = [
    { label: "未削除", value: "false" },
    { label: "削除済み", value: "true" },
  ];

  const videoKindOptions: MultiSelectOption[] = [
    { label: "通常動画", value: "standard" },
    { label: "ショート動画", value: "short" },
  ];

  const filters: FilterField[] = [
    {
      key: "talentId",
      label: "タレント",
      options: talentOptions,
      placeholder: "すべてのタレント",
      value: currentTalentIds,
    },
    {
      key: "status",
      label: "動画ステータス",
      options: statusOptions,
      placeholder: "すべて",
      value: currentStatus,
    },
    {
      key: "platform",
      label: "プラットフォーム",
      options: platformOptions,
      placeholder: "すべて",
      value: currentPlatform,
    },
    {
      key: "videoKind",
      label: "動画種別",
      options: videoKindOptions,
      placeholder: "すべて",
      value: currentVideoKind,
    },
    {
      key: "visible",
      label: "公開状態",
      options: visibilityOptions,
      placeholder: "すべて",
      value: currentVisible,
    },
    {
      key: "deleted",
      label: "削除状態",
      options: deletedOptions,
      placeholder: "すべて",
      value: currentDeleted,
    },
  ];
  const appliedCount = filters.filter(({ value }) => value.length > 0).length;

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="w-full sm:max-w-md">
        <label
          className="mb-1 block text-meta font-semibold"
          htmlFor="search-filter"
        >
          タイトルまたはIDで検索
        </label>
        <SearchInput
          id="search-filter"
          inputSize="md"
          placeholder="検索..."
          variant="default"
        />
      </div>
      <FilterBar activeCount={appliedCount}>
        {filters.map((filter) => (
          <div className="md:w-48" key={filter.key}>
            <div
              className="mb-1 block text-meta font-semibold"
              id={`video-filter-${filter.key}`}
            >
              {filter.label}で絞り込み
            </div>
            <MultiSelect
              aria-labelledby={`video-filter-${filter.key} video-filter-${filter.key}-value`}
              id={`video-filter-${filter.key}-value`}
              onChange={(values) => handleMultiSelectChange(filter.key, values)}
              options={filter.options}
              placeholder={filter.placeholder}
              value={filter.value}
            />
          </div>
        ))}
      </FilterBar>
    </div>
  );
}

/** 読み込み中の `VideoFilters`。検索欄と、6つの絞り込み（`filters`）を並べる */
export function VideoFiltersSkeleton() {
  return (
    <div aria-hidden="true" className="mb-4 flex flex-col gap-3">
      <FieldSkeleton className="w-full sm:max-w-md" />
      <FilterBarSkeleton>
        {range(6).map((filter) => (
          <FieldSkeleton
            className="md:w-48"
            key={`video-filter-skeleton-${filter}`}
          />
        ))}
      </FilterBarSkeleton>
    </div>
  );
}
