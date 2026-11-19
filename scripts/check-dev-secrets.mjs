#!/usr/bin/env node

/**
 * Check that the token of the local Redis HTTP API matches in every place.
 *
 * `serverless-redis-http` in `compose.yml` accepts the `SRH_TOKEN` of
 * `config/dev-secrets.env`, so the `UPSTASH_REDIS_REST_TOKEN` that the apps
 * send must be the same value:
 *
 * - `UPSTASH_REDIS_REST_TOKEN` of `config/dev-secrets.env` (Dev Container)
 * - `UPSTASH_REDIS_REST_TOKEN` of `apps/{web,admin,batch}/.env.local.sample`
 *
 * Usage:
 *   node scripts/check-dev-secrets.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const SECRETS_FILE = "config/dev-secrets.env";
const SAMPLE_FILES = [
  "apps/web/.env.local.sample",
  "apps/admin/.env.local.sample",
  "apps/batch/.env.local.sample",
];

/**
 * Read the value of the first uncommented assignment of a variable.
 * @param {string} file - Path relative to the repository root
 * @param {string} name - Variable name
 * @returns {string | undefined} The value without surrounding quotes
 */
const readVariable = (file, name) => {
  const content = readFileSync(path.join(root, file), "utf-8");

  for (const line of content.split("\n")) {
    const match = line.match(
      /^\s*(?<name>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?<value>.*?)\s*$/u
    );

    if (match?.groups.name === name) {
      return match.groups.value.replace(
        /^(?<quote>["'])(?<unquoted>.*)\k<quote>$/u,
        "$<unquoted>"
      );
    }
  }
};

const expected = readVariable(SECRETS_FILE, "SRH_TOKEN");

if (!expected) {
  console.error(`SRH_TOKEN is not set in ${SECRETS_FILE}`);
  process.exit(1);
}

const errors = [];

for (const file of [SECRETS_FILE, ...SAMPLE_FILES]) {
  const actual = readVariable(file, "UPSTASH_REDIS_REST_TOKEN");

  if (actual !== expected) {
    errors.push(
      `${file}: UPSTASH_REDIS_REST_TOKEN does not match SRH_TOKEN in ${SECRETS_FILE}`
    );
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

console.log(
  `UPSTASH_REDIS_REST_TOKEN matches SRH_TOKEN in ${SECRETS_FILE} (${SAMPLE_FILES.length + 1} files)`
);
