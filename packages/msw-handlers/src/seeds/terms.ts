import type { Tables } from "@shinju-date/database";

import { randomPast } from "./context.js";
import type { SeedContext } from "./context.js";

const TERMS = [
  {
    readings: ["うたわく"],
    synonyms: ["歌配信", "カラオケ配信"],
    term: "歌枠",
  },
  {
    readings: ["げーむはいしん"],
    synonyms: ["ゲーム実況"],
    term: "ゲーム配信",
  },
  { readings: ["こらぼ"], synonyms: ["コラボ配信", "共演"], term: "コラボ" },
  { readings: ["えーえすえむあーる"], synonyms: ["音フェチ"], term: "ASMR" },
] as const;

/** Search terms with their readings and synonyms. */
export function createTerms(context: SeedContext): Tables<"terms">[] {
  return TERMS.map(({ readings, synonyms, term }) => {
    const createdAt = randomPast(context, 365);

    return {
      created_at: createdAt,
      id: context.faker.string.uuid(),
      popularity: 0,
      readings: [...readings],
      synonyms: [...synonyms],
      term,
      updated_at: createdAt,
    };
  });
}
