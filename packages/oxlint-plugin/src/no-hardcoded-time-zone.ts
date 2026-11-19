import type { ESTree, Rule } from "@oxlint/plugins";

import { getStringValue } from "./strings.ts";

const TIME_ZONE = "Asia/Tokyo";

/**
 * Reports the time zone written directly in a string, instead of `TIME_ZONE`
 * of `@shinju-date/constants` (AGENTS.md の「時刻の扱い」). The definition of
 * the constant and the test files are left out in `oxlint.config.ts`.
 */
export const noHardcodedTimeZone = {
  create(context) {
    const check = (node: ESTree.Node) => {
      if (getStringValue(node)?.includes(TIME_ZONE)) {
        context.report({ messageId: "hardcodedTimeZone", node });
      }
    };

    return {
      Literal: check,
      TemplateElement: check,
    };
  },
  meta: {
    docs: {
      description:
        "Use TIME_ZONE of @shinju-date/constants instead of writing the time zone",
    },
    messages: {
      hardcodedTimeZone:
        "タイムゾーンを直接書かず、@shinju-date/constants の TIME_ZONE を使ってください。AGENTS.md の「時刻の扱い」を参照。",
    },
    type: "problem",
  },
} satisfies Rule;
