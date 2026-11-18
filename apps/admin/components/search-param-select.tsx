"use client";

import { Select } from "@shinju-date/ui";
import type { SelectProps } from "@shinju-date/ui";

import { useUpdateSearchParams } from "@/lib/use-update-search-params";

export interface SearchParamSelectProps extends Omit<
  SelectProps,
  "defaultValue" | "onChange" | "value"
> {
  /** 値を持つ URL のパラメータの名前 */
  paramName: string;
  /** 既定の値。この値を選んだときは、URL にパラメータを付けない */
  defaultValue: string;
  /** 今の値（ページで URL のパラメータを解釈したもの） */
  value: string;
}

/**
 * 選んだ値を URL のパラメータに書くセレクトボックス（`replace`、`page` を消す）。
 * 選択肢（`<option>`）は、サーバーコンポーネントから `children` で渡す。
 */
export const SearchParamSelect = ({
  defaultValue,
  paramName,
  value,
  ...props
}: SearchParamSelectProps) => {
  const updateSearchParams = useUpdateSearchParams();

  return (
    <Select
      {...props}
      onChange={(event) => {
        const nextValue = event.target.value;

        updateSearchParams({
          [paramName]: nextValue === defaultValue ? null : nextValue,
        });
      }}
      value={value}
    />
  );
};
