import { isUUID } from "./uuid";

/** タレントを URL で受け渡すときの検索パラメーターの名前 */
export const TALENT_SEARCH_PARAM = "talent";

/**
 * タレントの ID を重複を除いて並べ替える。同じ条件の URL と取得関数の
 * キャッシュを揃えるために使う。
 */
export const normalizeTalentIds = (ids: readonly string[]): string[] =>
  [...new Set(ids)].sort();

const toValues = (value: string | string[] | undefined): string[] =>
  Array.isArray(value) ? value : value ? [value] : [];

/**
 * 検索パラメーターのタレントの値に、UUID の形式でないものが含まれるか。
 */
export const hasInvalidTalentId = (
  value: string | string[] | undefined
): boolean => toValues(value).some((id) => !isUUID(id));

/**
 * 検索パラメーターの値をタレントの ID に変換する。UUID の形式でない値は
 * 無視する。`activeTalentIds` を指定したときは、それに含まれない ID も
 * 無視する。
 */
export const parseTalentIds = (
  value: string | string[] | undefined,
  activeTalentIds?: readonly string[]
): string[] => {
  const activeIds = activeTalentIds ? new Set(activeTalentIds) : null;

  return normalizeTalentIds(
    toValues(value)
      .filter(isUUID)
      .map((id) => id.toLowerCase())
      .filter((id) => !activeIds || activeIds.has(id))
  );
};
