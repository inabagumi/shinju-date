import type { ParsedUrlQuery } from "node:querystring";

/*
 * URL のパラメータを書き換えた URL を作る。サーバーコンポーネントからも使えるよう、
 * フック（`use-update-search-params.ts`）とは分けている
 */

const PAGE_PARAM = "page";

/**
 * パラメータに設定する値。配列は同じ名前の複数の値にする。
 * `null`・空文字・空の配列はパラメータを消し、`undefined` はそのまま引き継ぐ
 */
export type SearchParamValue = string | readonly string[] | null | undefined;

/** パラメータの名前と、設定する値 */
export type SearchParamUpdates = Readonly<Record<string, SearchParamValue>>;

export interface SearchParamsHrefOptions {
  /** `page` を消すか。既定は `true`（絞り込みを変えたら1ページ目に戻す） */
  resetPage?: boolean | undefined;
}

/**
 * 現在のパラメータを引き継いで、指定したパラメータだけを書き換えた URL を返す。
 */
export function buildSearchParamsHref(
  pathname: string,
  searchParams: URLSearchParams | string,
  updates: SearchParamUpdates,
  { resetPage = true }: SearchParamsHrefOptions = {}
): string {
  const params = new URLSearchParams(searchParams);

  for (const [name, value] of Object.entries(updates)) {
    if (value === undefined) {
      continue;
    }

    if (typeof value === "string") {
      if (value === "") {
        params.delete(name);
      } else {
        params.set(name, value);
      }
      continue;
    }

    params.delete(name);
    for (const item of value ?? []) {
      params.append(name, item);
    }
  }

  if (resetPage && !(PAGE_PARAM in updates)) {
    params.delete(PAGE_PARAM);
  }

  const queryString = params.toString();

  return queryString ? `${pathname}?${queryString}` : pathname;
}

/**
 * ページの `searchParams`（`ParsedUrlQuery`）を `URLSearchParams` にする。
 * 配列は同じ名前の複数の値にし、`undefined` の値は除く
 */
export function toURLSearchParams(query: ParsedUrlQuery): URLSearchParams {
  const params = new URLSearchParams();

  for (const [name, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) {
        params.append(name, item);
      }
    }
  }

  return params;
}
