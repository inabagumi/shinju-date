import { defineConfig } from "oxlint";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

import root from "../../oxlint.config.ts";

export default defineConfig({
  // The root comes last, so that its rules win over the presets
  extends: [react, next, root],
});
