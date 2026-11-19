/** 検索と頭文字のグループ分けに使う、用語の項目 */
interface GroupableTerm {
  term: string;
  readings: string[];
  synonyms: string[];
}

/** 頭文字のグループ。カタカナは行（ア行、カ行など）にまとめる */
const KATAKANA_GROUPS = [
  { end: "オ", group: "ア", start: "ア" },
  { end: "ゴ", group: "カ", start: "カ" },
  { end: "ゾ", group: "サ", start: "サ" },
  { end: "ド", group: "タ", start: "タ" },
  { end: "ノ", group: "ナ", start: "ナ" },
  { end: "ポ", group: "ハ", start: "ハ" },
  { end: "モ", group: "マ", start: "マ" },
  { end: "ヨ", group: "ヤ", start: "ヤ" },
  { end: "ロ", group: "ラ", start: "ラ" },
  { end: "ン", group: "ワ", start: "ワ" },
] as const;

/**
 * 頭文字のグループの名前。カタカナは行の最初の文字にし、それ以外は大文字にした
 * 最初の文字にする
 */
export const getInitialGroup = (text: string): string => {
  const firstChar = text.charAt(0).toUpperCase();

  for (const { end, group, start } of KATAKANA_GROUPS) {
    if (firstChar >= start && firstChar <= end) {
      return group;
    }
  }

  return firstChar;
};

/**
 * 用語、読み方、類義語のどれかに検索語を含む用語（大文字と小文字を区別しない）。
 * 検索語がなければ、すべての用語
 */
export const filterTerms = <T extends GroupableTerm>(
  terms: readonly T[],
  search: string | undefined
): T[] => {
  if (!search) {
    return [...terms];
  }

  const query = search.toLowerCase();

  return terms.filter(
    (term) =>
      term.term.toLowerCase().includes(query) ||
      term.readings.some((reading) => reading.toLowerCase().includes(query)) ||
      term.synonyms.some((synonym) => synonym.toLowerCase().includes(query))
  );
};

/** 頭文字のグループと、そのグループの用語 */
export interface TermGroup<T> {
  group: string;
  terms: T[];
}

/** Compares two strings by their UTF-16 code units, like the default `sort()` */
const compareCodeUnits = (a: string, b: string): number => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

/**
 * 用語を、最初の読み方（なければ用語）の頭文字でグループに分ける。グループは
 * 名前の順に並べ、グループの中は渡した順のままにする
 */
export const groupTermsByInitial = <T extends GroupableTerm>(
  terms: readonly T[]
): TermGroup<T>[] => {
  const groups = new Map<string, T[]>();

  for (const term of terms) {
    const group = getInitialGroup(term.readings[0] || term.term);
    const groupTerms = groups.get(group);

    if (groupTerms) {
      groupTerms.push(term);
    } else {
      groups.set(group, [term]);
    }
  }

  return [...groups.entries()]
    .toSorted(([a], [b]) => compareCodeUnits(a, b))
    .map(([group, groupTerms]) => ({ group, terms: groupTerms }));
};
