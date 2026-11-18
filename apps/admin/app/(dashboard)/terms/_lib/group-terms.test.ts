import { describe, expect, it } from "vitest";

import {
  filterTerms,
  getInitialGroup,
  groupTermsByInitial,
} from "./group-terms";

const createTerm = (
  term: string,
  readings: string[],
  synonyms: string[] = []
) => ({ readings, synonyms, term });

describe(getInitialGroup, () => {
  it.each([
    ["アイ", "ア"],
    ["ガギ", "カ"],
    ["ゾウ", "サ"],
    ["ドア", "タ"],
    ["ポップ", "ハ"],
    ["ンー", "ワ"],
  ])("groups the katakana %s into the row %s", (text, group) => {
    expect(getInitialGroup(text)).toBe(group);
  });

  it("uses the first character in upper case for the others", () => {
    expect(getInitialGroup("asmr")).toBe("A");
    expect(getInitialGroup("うたわく")).toBe("う");
    expect(getInitialGroup("")).toBe("");
  });
});

describe(filterTerms, () => {
  const terms = [
    createTerm("歌枠", ["うたわく"], ["カラオケ配信"]),
    createTerm("ASMR", ["えーえすえむあーる"], ["音フェチ"]),
  ];

  it("returns every term without a search", () => {
    expect(filterTerms(terms, undefined)).toStrictEqual(terms);
  });

  it("searches the term, the readings and the synonyms, ignoring the case", () => {
    expect(filterTerms(terms, "asmr")).toStrictEqual([terms[1]]);
    expect(filterTerms(terms, "うた")).toStrictEqual([terms[0]]);
    expect(filterTerms(terms, "フェチ")).toStrictEqual([terms[1]]);
    expect(filterTerms(terms, "none")).toStrictEqual([]);
  });
});

describe(groupTermsByInitial, () => {
  it("groups by the initial of the first reading and sorts the groups", () => {
    const utawaku = createTerm("歌枠", ["ウタワク"]);
    const asmr = createTerm("ASMR", []);
    const game = createTerm("ゲーム配信", ["ゲームハイシン"]);
    const karaoke = createTerm("カラオケ", ["カラオケ"]);

    expect(groupTermsByInitial([utawaku, asmr, game, karaoke])).toStrictEqual([
      { group: "A", terms: [asmr] },
      { group: "ア", terms: [utawaku] },
      { group: "カ", terms: [game, karaoke] },
    ]);
  });

  it("returns no groups for no terms", () => {
    expect(groupTermsByInitial([])).toStrictEqual([]);
  });
});
