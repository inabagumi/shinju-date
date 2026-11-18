import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import playwright from "ultracite/oxlint/playwright";
import vitest from "ultracite/oxlint/vitest";

// ---------------------------------------------------------------------------
// The rules of the presets that the code violates, turned off for now. They
// are turned back on one by one, with the code fixed, in #7400.
// ---------------------------------------------------------------------------

const temporarilyDisabled = defineConfig({
  rules: {
    "class-methods-use-this": "off",
    complexity: "off",
    curly: "off",
    "default-case": "off",
    eqeqeq: "off",
    "func-name-matching": "off",
    "func-names": "off",
    // Reports the type-only default export of @shinju-date/database, once the
    // packages are built
    "import/default": "off",
    "import/first": "off",
    "import/no-named-default": "off",
    "jsdoc/check-tag-names": "off",
    "jsdoc/require-param-description": "off",
    "jsdoc/require-property-description": "off",
    "jsdoc/require-returns-description": "off",
    "jsdoc/require-throws-type": "off",
    "jsdoc/require-yields": "off",
    "jsdoc/require-yields-type": "off",
    "jsx-a11y/control-has-associated-label": "off",
    "jsx-a11y/heading-has-content": "off",
    "jsx-a11y/prefer-tag-over-role": "off",
    "max-classes-per-file": "off",
    "nextjs/no-assign-module-variable": "off",
    "no-alert": "off",
    "no-await-in-loop": "off",
    "no-bitwise": "off",
    "no-else-return": "off",
    "no-empty-function": "off",
    "no-eq-null": "off",
    "no-inline-comments": "off",
    "no-loop-func": "off",
    "no-nested-ternary": "off",
    "no-param-reassign": "off",
    "no-plusplus": "off",
    "no-promise-executor-return": "off",
    "no-script-url": "off",
    "no-shadow": "off",
    "no-unreachable-loop": "off",
    "no-use-before-define": "off",
    "node/callback-return": "off",
    "oxc/no-barrel-file": "off",
    "prefer-destructuring": "off",
    "prefer-named-capture-group": "off",
    "promise/always-return": "off",
    "promise/avoid-new": "off",
    "promise/no-nesting": "off",
    "promise/param-names": "off",
    "promise/prefer-await-to-callbacks": "off",
    "promise/prefer-catch": "off",
    "react/hook-use-state": "off",
    "react/invariant": "off",
    "react/jsx-handler-names": "off",
    "react/jsx-no-constructed-context-values": "off",
    "react/jsx-no-useless-fragment": "off",
    "react/no-clone-element": "off",
    "react/no-object-type-as-default-prop": "off",
    "react/no-unescaped-entities": "off",
    "react/rules-of-hooks": "off",
    "react/set-state-in-effect": "off",
    "react/state-in-constructor": "off",
    "react/todo": "off",
    "require-await": "off",
    "require-unicode-regexp": "off",
    "typescript/consistent-type-imports": "off",
    "typescript/method-signature-style": "off",
    "typescript/no-empty-interface": "off",
    "typescript/no-empty-object-type": "off",
    "typescript/no-extraneous-class": "off",
    "typescript/no-invalid-void-type": "off",
    "typescript/parameter-properties": "off",
    "unicorn/consistent-function-scoping": "off",
    "unicorn/error-message": "off",
    "unicorn/import-style": "off",
    "unicorn/no-array-for-each": "off",
    "unicorn/no-array-reduce": "off",
    "unicorn/no-array-reverse": "off",
    "unicorn/no-array-sort": "off",
    "unicorn/no-await-expression-member": "off",
    "unicorn/no-empty-file": "off",
    "unicorn/no-lonely-if": "off",
    "unicorn/no-new-array": "off",
    "unicorn/no-object-as-default-parameter": "off",
    "unicorn/no-useless-collection-argument": "off",
    "unicorn/no-useless-spread": "off",
    "unicorn/no-useless-undefined": "off",
    "unicorn/prefer-array-find": "off",
    "unicorn/prefer-code-point": "off",
    "unicorn/prefer-native-coercion-functions": "off",
    "unicorn/prefer-number-coercion": "off",
    "unicorn/prefer-query-selector": "off",
    "unicorn/prefer-set-has": "off",
    "unicorn/prefer-spread": "off",
    "unicorn/prefer-string-slice": "off",
    "unicorn/prefer-structured-clone": "off",
    "unicorn/prefer-ternary": "off",
  },
});

// ---------------------------------------------------------------------------

const TEMPORAL_MESSAGE =
  "Temporal はグローバルを使ってください。AGENTS.md の「時刻の扱い」を参照。";

export default defineConfig({
  env: core.env,
  extends: [core, vitest, playwright, temporarilyDisabled],
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
