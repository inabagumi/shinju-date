import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import playwright from "ultracite/oxlint/playwright";
import vitest from "ultracite/oxlint/vitest";

/** The test files of the Vitest preset, whose rules are set in its overrides */
const TEST_FILES = [
  "**/*.{test,spec,test-d,spec-d}.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
  "**/__tests__/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
];

// ---------------------------------------------------------------------------
// The rules of the presets that the code violates, turned off for now. They
// are turned back on one by one, with the code fixed, in #7400.
//
// The Vitest preset turns on the vitest plugin and its rules only in an
// override for the test files, so they are turned off in an override for the
// same files, which also names the plugin (without it, the rules stay on).
// ---------------------------------------------------------------------------

const temporarilyDisabled = defineConfig({
  overrides: [
    {
      files: TEST_FILES,
      plugins: ["vitest"],
      rules: {
        "vitest/consistent-test-filename": "off",
        "vitest/consistent-test-it": "off",
        "vitest/expect-expect": "off",
        "vitest/max-expects": "off",
        "vitest/no-alias-methods": "off",
        "vitest/no-conditional-expect": "off",
        "vitest/no-import-node-test": "off",
        "vitest/padding-around-after-all-blocks": "off",
        "vitest/padding-around-test-blocks": "off",
        "vitest/prefer-called-exactly-once-with": "off",
        "vitest/prefer-called-once": "off",
        "vitest/prefer-called-with": "off",
        "vitest/prefer-describe-function-title": "off",
        "vitest/prefer-expect-resolves": "off",
        "vitest/prefer-import-in-mock": "off",
        "vitest/prefer-mock-return-shorthand": "off",
        "vitest/prefer-strict-equal": "off",
        "vitest/prefer-to-be": "off",
        "vitest/prefer-to-be-falsy": "off",
        "vitest/prefer-to-be-truthy": "off",
        "vitest/prefer-to-have-been-called-times": "off",
        "vitest/prefer-to-have-length": "off",
        "vitest/require-mock-type-parameters": "off",
        "vitest/require-to-throw-message": "off",
        "vitest/require-top-level-describe": "off",
        "vitest/valid-expect": "off",
      },
    },
  ],
  rules: {
    "arrow-body-style": "off",
    "class-methods-use-this": "off",
    complexity: "off",
    curly: "off",
    "default-case": "off",
    eqeqeq: "off",
    "func-name-matching": "off",
    "func-names": "off",
    "func-style": "off",
    "import/consistent-type-specifier-style": "off",
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
    "no-negated-condition": "off",
    "no-nested-ternary": "off",
    "no-param-reassign": "off",
    "no-plusplus": "off",
    "no-promise-executor-return": "off",
    "no-script-url": "off",
    "no-shadow": "off",
    "no-unreachable-loop": "off",
    "no-use-before-define": "off",
    "node/callback-return": "off",
    "operator-assignment": "off",
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
    "react/jsx-curly-brace-presence": "off",
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
    "typescript/array-type": "off",
    "typescript/consistent-type-imports": "off",
    "typescript/method-signature-style": "off",
    "typescript/no-empty-interface": "off",
    "typescript/no-empty-object-type": "off",
    "typescript/no-extraneous-class": "off",
    "typescript/no-invalid-void-type": "off",
    "typescript/parameter-properties": "off",
    "unicorn/catch-error-name": "off",
    "unicorn/consistent-existence-index-check": "off",
    "unicorn/consistent-function-scoping": "off",
    "unicorn/error-message": "off",
    "unicorn/escape-case": "off",
    "unicorn/filename-case": "off",
    "unicorn/import-style": "off",
    "unicorn/no-array-for-each": "off",
    "unicorn/no-array-reduce": "off",
    "unicorn/no-array-reverse": "off",
    "unicorn/no-array-sort": "off",
    "unicorn/no-await-expression-member": "off",
    "unicorn/no-empty-file": "off",
    "unicorn/no-lonely-if": "off",
    "unicorn/no-negated-condition": "off",
    "unicorn/no-new-array": "off",
    "unicorn/no-object-as-default-parameter": "off",
    "unicorn/no-typeof-undefined": "off",
    "unicorn/no-useless-collection-argument": "off",
    "unicorn/no-useless-spread": "off",
    "unicorn/no-useless-undefined": "off",
    "unicorn/no-zero-fractions": "off",
    "unicorn/numeric-separators-style": "off",
    "unicorn/prefer-array-find": "off",
    "unicorn/prefer-at": "off",
    "unicorn/prefer-code-point": "off",
    "unicorn/prefer-import-meta-properties": "off",
    "unicorn/prefer-native-coercion-functions": "off",
    "unicorn/prefer-number-coercion": "off",
    "unicorn/prefer-number-properties": "off",
    "unicorn/prefer-optional-catch-binding": "off",
    "unicorn/prefer-query-selector": "off",
    "unicorn/prefer-set-has": "off",
    "unicorn/prefer-spread": "off",
    "unicorn/prefer-string-replace-all": "off",
    "unicorn/prefer-string-slice": "off",
    "unicorn/prefer-structured-clone": "off",
    "unicorn/prefer-ternary": "off",
    "unicorn/switch-case-braces": "off",
    "unicorn/text-encoding-identifier-case": "off",
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
        "config/oxlint/src/fixtures.ts",
        "config/oxlint/src/no-hardcoded-time-zone.ts",
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
