/**
 * Tests for `oxlint.config.ts` at the root and in the workspaces.
 *
 * Writes fixtures into temporary directories in the apps and the packages
 * (so that the `oxlint.config.ts` of each workspace is used), runs oxlint,
 * and checks that the rules of this project are on, and that they are off
 * for the files they leave out.
 *
 * The fixtures of the files that are left out (test files and `e2e/`) are
 * written where the Vitest of the workspace does not pick them up, because
 * turbo runs its tests at the same time: `e2e/` of the apps, and outside
 * `src/` of `packages/ui`.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  getReportedLines,
  TAILWIND_FIXTURE,
  TIME_ZONE_FIXTURE,
} from "./fixtures.ts";

const root = resolve(import.meta.dirname, "../../..");
const oxlint = join(root, "node_modules", ".bin", "oxlint");

const TEMP_DIR_NAME = `__oxlint-config-test-${process.pid}__`;
const TEMP_PARENTS = ["apps/admin", "apps/batch", "apps/web", "packages/ui"];

/** The fixtures of the files that are left out, for each workspace */
const LEFT_OUT_FILES: Record<string, string[]> = {
  "apps/admin": ["e2e/project-rules.ts", "e2e/time-zone.tsx"],
  "apps/batch": ["e2e/project-rules.ts", "e2e/time-zone.tsx"],
  "apps/web": ["e2e/project-rules.ts", "e2e/time-zone.tsx"],
  "packages/ui": ["project-rules.test.ts", "time-zone.test.tsx"],
};

const PROJECT_RULES_FIXTURE = `import { twMerge } from 'tailwind-merge' // report: no-restricted-imports
import 'temporal-polyfill/global' // report: no-restricted-imports
import { Temporal } from 'temporal-polyfill' // report: no-restricted-imports

type Props = { name: string } // report: typescript/consistent-type-definitions

export const now = new Date() // report: no-restricted-globals
export const merge = (props: Props) => twMerge(props.name, Temporal.Now.instant())
`;

interface Diagnostic {
  code: string;
  filename: string;
  labels: { span: { line: number } }[];
}

/** Expected `<rule>` -> lines, from the lines that end with `// report: <rule>` */
const getExpectedRules = (source: string): Map<string, number[]> => {
  const rules = new Map<string, number[]>();

  for (const [index, line] of source.split("\n").entries()) {
    const rule = /\/\/ report: (\S+)$/u.exec(line)?.[1];

    if (rule) {
      rules.set(rule, [...(rules.get(rule) ?? []), index + 1]);
    }
  }

  return rules;
};

/** `eslint(no-restricted-imports)` -> `no-restricted-imports` */
const getRuleName = (code: string): string => {
  const [, plugin, rule] = /^([^(]+)\((.+)\)$/u.exec(code) ?? [];

  if (!(plugin && rule)) {
    return code;
  }

  return plugin === "eslint" ? rule : `${plugin}/${rule}`;
};

/**
 * Runs oxlint and returns the lines that each rule reports, by file.
 *
 * @param paths - Paths relative to the repository root
 * @returns file -> rule -> lines
 */
const lint = (paths: string[]): Map<string, Map<string, number[]>> => {
  const result = spawnSync(oxlint, ["--format=json", ...paths], {
    cwd: root,
    encoding: "utf-8",
  });

  if (!result.stdout) {
    throw new Error(`oxlint did not print a report: ${result.stderr}`);
  }

  const { diagnostics } = JSON.parse(result.stdout) as {
    diagnostics: Diagnostic[];
  };
  const reports = new Map<string, Map<string, number[]>>();

  for (const diagnostic of diagnostics) {
    const byRule = reports.get(diagnostic.filename) ?? new Map();
    const rule = getRuleName(diagnostic.code);
    const line = diagnostic.labels[0]?.span.line;

    if (line !== undefined) {
      byRule.set(rule, [...new Set([...(byRule.get(rule) ?? []), line])]);
    }

    reports.set(diagnostic.filename, byRule);
  }

  return reports;
};

describe("oxlint.config.ts", () => {
  const fixtures = new Map<string, string>();
  let reports = new Map<string, Map<string, number[]>>();

  const getLines = (file: string, rule: string): number[] =>
    (reports.get(file)?.get(rule) ?? []).toSorted((a, b) => a - b);

  beforeAll(() => {
    for (const parent of TEMP_PARENTS) {
      const dir = join(parent, TEMP_DIR_NAME);

      fixtures.set(join(dir, "project-rules.tsx"), PROJECT_RULES_FIXTURE);
      fixtures.set(join(dir, "time-zone.tsx"), TIME_ZONE_FIXTURE);
      fixtures.set(join(dir, "tailwind.tsx"), TAILWIND_FIXTURE);

      const [projectRules, timeZone] = LEFT_OUT_FILES[parent] ?? [];

      if (projectRules && timeZone) {
        fixtures.set(join(dir, projectRules), PROJECT_RULES_FIXTURE);
        fixtures.set(join(dir, timeZone), TIME_ZONE_FIXTURE);
      }
    }

    for (const [path, source] of fixtures) {
      mkdirSync(join(root, dirname(path)), { recursive: true });
      writeFileSync(join(root, path), source);
    }

    reports = lint([
      ...TEMP_PARENTS.map((parent) => join(parent, TEMP_DIR_NAME)),
      "packages/constants/src/index.ts",
      "packages/ui/src/tw-merge.test.ts",
      "packages/ui/src/tw-merge.ts",
    ]);
  });

  afterAll(() => {
    for (const parent of TEMP_PARENTS) {
      rmSync(join(root, parent, TEMP_DIR_NAME), {
        force: true,
        recursive: true,
      });
    }
  });

  describe.each(TEMP_PARENTS)("in %s", (parent) => {
    const dir = join(parent, TEMP_DIR_NAME);
    const [projectRules = "", timeZone = ""] = LEFT_OUT_FILES[parent] ?? [];

    it.each([...getExpectedRules(PROJECT_RULES_FIXTURE)])(
      "reports %s",
      (rule, lines) => {
        expect(getLines(join(dir, "project-rules.tsx"), rule)).toStrictEqual(
          lines
        );
      }
    );

    it(`does not report Date in ${projectRules}`, () => {
      const file = join(dir, projectRules);

      expect(getLines(file, "no-restricted-globals")).toStrictEqual([]);
      expect(getLines(file, "no-restricted-imports")).toHaveLength(3);
    });

    it("reports the time zone written directly", () => {
      expect(
        getLines(
          join(dir, "time-zone.tsx"),
          "shinju-date/no-hardcoded-time-zone"
        )
      ).toStrictEqual(getReportedLines(TIME_ZONE_FIXTURE));
    });

    it(`does not report the time zone in ${timeZone}`, () => {
      expect(
        getLines(join(dir, timeZone), "shinju-date/no-hardcoded-time-zone")
      ).toStrictEqual([]);
    });

    it("reports the default scales and dark:", () => {
      expect(
        getLines(
          join(dir, "tailwind.tsx"),
          "shinju-date/no-default-tailwind-scale"
        )
      ).toStrictEqual(getReportedLines(TAILWIND_FIXTURE));
    });
  });

  it("does not report the definition of TIME_ZONE", () => {
    const file = "packages/constants/src/index.ts";

    expect(readFileSync(join(root, file), "utf-8")).toMatch(/"Asia\/Tokyo"/u);
    expect(getLines(file, "shinju-date/no-hardcoded-time-zone")).toStrictEqual(
      []
    );
  });

  it("does not report twMerge and its tests", () => {
    const file = "packages/ui/src/tw-merge.ts";
    const testFile = "packages/ui/src/tw-merge.test.ts";

    expect(readFileSync(join(root, file), "utf-8")).toMatch(/tailwind-merge/u);
    expect(readFileSync(join(root, testFile), "utf-8")).toMatch(/"text-sm"/u);
    expect(getLines(file, "no-restricted-imports")).toStrictEqual([]);
    expect(
      getLines(testFile, "shinju-date/no-default-tailwind-scale")
    ).toStrictEqual([]);
  });
});
