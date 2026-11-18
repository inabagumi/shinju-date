import { defineConfig } from "oxlint";
import react from "ultracite/oxlint/react";

import root from "../../oxlint.config.ts";

export default defineConfig({
  // The root comes last, so that its rules win over the presets
  extends: [react, root],
  overrides: [
    {
      // twMerge, which registers the font sizes and the others of theme.css,
      // and its tests
      files: ["src/tw-merge.ts", "src/tw-merge.test.ts"],
      rules: {
        "no-restricted-imports": "off",
        "shinju-date/no-default-tailwind-scale": "off",
      },
    },
  ],
});
