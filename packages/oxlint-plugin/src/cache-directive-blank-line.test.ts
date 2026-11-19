import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import { cacheDirectiveBlankLine } from "./cache-directive-blank-line.ts";
import { CACHE_DIRECTIVE_FIXTURE, REPORT_MARKER } from "./fixtures.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    sourceType: "module",
  },
});

ruleTester.run("cache-directive-blank-line", cacheDirectiveBlankLine, {
  invalid: [
    {
      code: `export async function getTalent() {
  'use cache'
  return await fetchTalent()
}
`,
      errors: [{ line: 3, messageId: "directive" }],
      filename: "fixture.ts",
      name: "a statement right after the directive",
      output: `export async function getTalent() {
  'use cache'

  return await fetchTalent()
}
`,
    },
    {
      code: `export async function getTalent() {
  'use cache: private'
  cacheLife('minutes')

  return await fetchTalent()
}
`,
      errors: [{ line: 3, messageId: "directive" }],
      filename: "fixture.ts",
      name: "the cache functions right after the directive",
      output: `export async function getTalent() {
  'use cache: private'

  cacheLife('minutes')

  return await fetchTalent()
}
`,
    },
    {
      code: `export async function getTalent() {
  'use cache: remote'

  cacheLife('hours')
  cacheTag('talents')
  return await fetchTalent()
}
`,
      errors: [{ line: 6, messageId: "cacheFunctions" }],
      filename: "fixture.ts",
      name: "a statement right after the cache functions",
      output: `export async function getTalent() {
  'use cache: remote'

  cacheLife('hours')
  cacheTag('talents')

  return await fetchTalent()
}
`,
    },
    {
      code: `export async function getTalent() {
  'use cache: remote'
  // Cached for an hour
  cacheLife('hours')

  return await fetchTalent()
}
`,
      errors: [{ line: 4, messageId: "directive" }],
      filename: "fixture.ts",
      name: "a comment that is not separated by a blank line",
      output: `export async function getTalent() {
  'use cache: remote'

  // Cached for an hour
  cacheLife('hours')

  return await fetchTalent()
}
`,
    },
    {
      code: `export async function getTalent() {
  "use cache: remote"; // Public data
  cacheLife("hours");
  cacheTag("talents"); // By talent
  return await fetchTalent();
}
`,
      errors: [
        { line: 3, messageId: "directive" },
        { line: 5, messageId: "cacheFunctions" },
      ],
      filename: "fixture.ts",
      name: "the comments at the end of the lines",
      output: `export async function getTalent() {
  "use cache: remote"; // Public data

  cacheLife("hours");
  cacheTag("talents"); // By talent

  return await fetchTalent();
}
`,
    },
    {
      code: "export async function getTalent() {\r\n  'use cache'\r\n  return await fetchTalent()\r\n}\r\n",
      errors: [{ line: 3, messageId: "directive" }],
      filename: "fixture.ts",
      name: "CRLF",
      output:
        "export async function getTalent() {\r\n  'use cache'\r\n\r\n  return await fetchTalent()\r\n}\r\n",
    },
    {
      code: "export async function getTalent() { 'use cache'; return await fetchTalent() }\n",
      errors: [{ line: 1, messageId: "directive" }],
      filename: "fixture.ts",
      name: "a statement on the same line",
      output:
        "export async function getTalent() { 'use cache';\n\n return await fetchTalent() }\n",
    },
    {
      code: `'use cache'
export async function getTalent() {}
`,
      errors: [{ line: 2, messageId: "directive" }],
      filename: "fixture.ts",
      name: "the directive at the top of a file",
      output: `'use cache'

export async function getTalent() {}
`,
    },
    {
      code: `const getTalent = async () => {
  'use cache: remote'
  return <div />
}

class Repository {
  async find() {
    'use cache'

    if (cond) {
      cacheTag('talents')
      return <div />
    }
  }
}
`,
      errors: [
        { line: 3, messageId: "directive" },
        { line: 12, messageId: "cacheFunctions" },
      ],
      filename: "fixture.tsx",
      name: "arrow functions, methods and nested blocks in TSX",
      output: `const getTalent = async () => {
  'use cache: remote'

  return <div />
}

class Repository {
  async find() {
    'use cache'

    if (cond) {
      cacheTag('talents')

      return <div />
    }
  }
}
`,
    },
    {
      code: `class Repository {
  static {
    cacheTag('talents')
    init()
  }
}

namespace Talents {
  cacheLife('hours')
  init()
}

switch (kind) {
  case 'talent':
    cacheTag('talents')
    break
}
`,
      errors: [
        { line: 4, messageId: "cacheFunctions" },
        { line: 10, messageId: "cacheFunctions" },
        { line: 16, messageId: "cacheFunctions" },
      ],
      filename: "fixture.ts",
      name: "static blocks, namespaces and switch cases",
      output: `class Repository {
  static {
    cacheTag('talents')

    init()
  }
}

namespace Talents {
  cacheLife('hours')

  init()
}

switch (kind) {
  case 'talent':
    cacheTag('talents')

    break
}
`,
    },
    {
      code: CACHE_DIRECTIVE_FIXTURE,
      errors: [
        { line: 5, messageId: "directive" },
        { line: 7, messageId: "cacheFunctions" },
        { line: 12, messageId: "directive" },
      ],
      filename: "cache-directives.tsx",
      name: "the fixture of the config tests",
      // A blank line before each reported line
      output: CACHE_DIRECTIVE_FIXTURE.split("\n")
        .flatMap((line) => (line.endsWith(REPORT_MARKER) ? ["", line] : [line]))
        .join("\n"),
    },
  ],
  valid: [
    {
      code: `export async function getTalent() {
  'use cache: remote'

  cacheLife('hours')
  cacheTag('talents')

  return await fetchTalent()
}
`,
      filename: "fixture.ts",
      name: "blank lines after the directive and the cache functions",
    },
    {
      code: `export async function getTalent() {
  'use cache: remote'

  // Cached for an hour
  cacheLife('hours')
  // Tagged by talent
  cacheTag('talents')

  return await fetchTalent()
}
`,
      filename: "fixture.ts",
      name: "comments after the blank line and between the cache functions",
    },
    {
      code: `export async function warm() {
  'use cache'
}

export async function tag(id) {
  cacheTag(id)
}
`,
      filename: "fixture.js",
      name: "the directive and the cache functions at the end of a block",
    },
    {
      code: `'use client'
import { useState } from 'react'

export async function getTalent() {
  'use server'
  revalidateTag('talents')
  return 'use cache'
}
`,
      filename: "fixture.ts",
      name: "other directives and other functions",
    },
  ],
});
