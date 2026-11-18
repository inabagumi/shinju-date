import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import { getReportedLines, TIME_ZONE_FIXTURE } from "./fixtures.ts";
import { noHardcodedTimeZone } from "./no-hardcoded-time-zone.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    sourceType: "module",
  },
});

ruleTester.run("no-hardcoded-time-zone", noHardcodedTimeZone, {
  invalid: [
    {
      code: TIME_ZONE_FIXTURE,
      errors: getReportedLines(TIME_ZONE_FIXTURE).map((line) => ({
        line,
        messageId: "hardcodedTimeZone",
      })),
      filename: "time-zone.tsx",
      name: "the time zone written directly",
    },
  ],
  valid: [
    {
      code: "export const timeZone = Temporal.Now.timeZoneId()",
      filename: "time-zone.ts",
      name: "no time zone",
    },
  ],
});
