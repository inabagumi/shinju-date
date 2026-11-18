import { defineConfig } from "oxlint";
import next from "ultracite/oxlint/next";

import root from "../../oxlint.config.ts";

export default defineConfig({
  // The root comes last, so that its rules win over the presets
  extends: [next, root],
});
