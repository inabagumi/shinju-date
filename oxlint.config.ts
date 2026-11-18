import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import playwright from "ultracite/oxlint/playwright";
import vitest from "ultracite/oxlint/vitest";

const TEMPORAL_MESSAGE =
  "Temporal はグローバルを使ってください。AGENTS.md の「時刻の扱い」を参照。";

export default defineConfig({
  env: core.env,
  extends: [core, vitest, playwright],
  ignorePatterns: [
    ...core.ignorePatterns,
    ".agents/skills/next-*",
    ".devcontainer/devcontainer-lock.json",
    "packages/database/types/supabase.ts",
    "skills-lock.json",
  ],
  jsPlugins: ["@shinju-date/oxlint-plugin"],
  overrides: [
    {
      // The Playwright specs, which the Vitest preset also matches by
      // `*.spec.ts`. Playwright runs only `*.spec.ts`, so they keep the name.
      // Naming the plugin lets the override turn the preset's rule off.
      files: ["**/e2e/**"],
      plugins: ["vitest"],
      rules: {
        "vitest/consistent-test-filename": "off",
      },
    },
    {
      files: ["**/*.test.*", "**/e2e/**"],
      rules: {
        "no-restricted-globals": "off",
        "shinju-date/no-hardcoded-time-zone": "off",
      },
    },
    {
      // Loads temporal-polyfill/global for the browsers
      files: ["**/instrumentation-client.ts"],
      rules: {
        "no-restricted-imports": "off",
      },
    },
    {
      // The definition of TIME_ZONE, and the rule that reports the time zone
      // and its fixtures
      files: [
        "packages/oxlint-plugin/src/fixtures.ts",
        "packages/oxlint-plugin/src/no-hardcoded-time-zone.ts",
        "packages/constants/src/index.ts",
      ],
      rules: {
        "shinju-date/no-hardcoded-time-zone": "off",
      },
    },
    {
      // Defines the font sizes and the others of theme.css
      files: ["packages/tailwind-config/**"],
      rules: {
        "shinju-date/no-default-tailwind-scale": "off",
      },
    },
  ],
  rules: {
    "no-restricted-globals": [
      "error",
      {
        message:
          "Temporal を使ってください。AGENTS.md の「時刻の扱い」を参照。",
        name: "Date",
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            message:
              "theme.css の文字サイズなどを登録した twMerge を @shinju-date/ui からインポートしてください。",
            name: "tailwind-merge",
          },
          {
            message: TEMPORAL_MESSAGE,
            name: "temporal-polyfill",
          },
        ],
        patterns: [
          {
            group: ["temporal-polyfill/**"],
            message: TEMPORAL_MESSAGE,
          },
        ],
      },
    ],
    "shinju-date/no-default-tailwind-scale": "error",
    "shinju-date/no-hardcoded-time-zone": "error",
  },
});
