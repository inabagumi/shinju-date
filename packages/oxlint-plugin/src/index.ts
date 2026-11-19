import type { Plugin } from "@oxlint/plugins";

import { cacheDirectiveBlankLine } from "./cache-directive-blank-line.ts";
import { noDefaultTailwindScale } from "./no-default-tailwind-scale.ts";
import { noHardcodedTimeZone } from "./no-hardcoded-time-zone.ts";

/**
 * The oxlint rules of SHINJU DATE. `oxlint.config.ts` at the root loads this
 * plugin with `jsPlugins`, and turns the rules on.
 */
const plugin = {
  meta: {
    name: "shinju-date",
  },
  rules: {
    "cache-directive-blank-line": cacheDirectiveBlankLine,
    "no-default-tailwind-scale": noDefaultTailwindScale,
    "no-hardcoded-time-zone": noHardcodedTimeZone,
  },
} satisfies Plugin;

export default plugin;
