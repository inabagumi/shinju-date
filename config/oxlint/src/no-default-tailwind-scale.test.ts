import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import { getReportedLines, TAILWIND_FIXTURE } from "./fixtures.ts";
import { noDefaultTailwindScale } from "./no-default-tailwind-scale.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    sourceType: "module",
  },
});

ruleTester.run("no-default-tailwind-scale", noDefaultTailwindScale, {
  invalid: [
    {
      code: TAILWIND_FIXTURE,
      errors: getReportedLines(TAILWIND_FIXTURE).map((line) => ({
        line,
        messageId: "defaultTailwindScale",
      })),
      filename: "tailwind.tsx",
      name: "the default scales and dark:",
    },
  ],
  valid: [
    {
      code: 'export const a = <div className="text-body rounded-control" />',
      filename: "tailwind.tsx",
      name: "the scales of theme.css",
    },
  ],
});
