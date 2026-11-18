import { defineConfig } from "tsdown";
import type { UserConfig } from "tsdown";

export interface PackageConfigOptions extends UserConfig {
  /** The source files to build. Each one becomes a file in `dist/`. */
  entry: NonNullable<UserConfig["entry"]>;
}

/**
 * The tsdown settings that every package in `packages/*` shares.
 *
 * - `dts`: emits the `.d.ts` files that the `types` condition of `exports`
 *   points to
 * - `fixedExtension: false`: emits `.js` and `.d.ts` (not `.mjs` and
 *   `.d.mts`), because every package has `"type": "module"`
 */
const defaults = {
  dts: true,
  fixedExtension: false,
  format: "esm",
  sourcemap: true,
  target: "es2022",
} as const satisfies UserConfig;

/**
 * Returns the tsdown configuration for a package in `packages/*`.
 *
 * Pass the entries and, only when a package needs it, the settings that
 * differ from the shared ones. Write the reason for each override in a
 * comment next to it.
 *
 * @example
 * ```ts
 * import { definePackageConfig } from '@shinju-date/config/tsdown'
 *
 * export default definePackageConfig({
 *   entry: ['./src/index.ts'],
 * })
 * ```
 */
export const definePackageConfig = (
  options: PackageConfigOptions
): UserConfig => defineConfig({ ...defaults, ...options });
