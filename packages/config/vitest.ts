import react from '@vitejs/plugin-react'
import { mergeConfig, type ViteUserConfig } from 'vitest/config'

/**
 * The Vitest settings that every package and app shares. The tests import
 * `describe`, `expect` and the others from `vitest`, so `globals` is off.
 */
const defaults = {
  test: {
    environment: 'node',
  },
} as const satisfies ViteUserConfig

/**
 * The settings for the tests of React components: the JSX transform of
 * `@vitejs/plugin-react` and a DOM from jsdom. A function, so that each
 * configuration gets its own instance of the plugin.
 */
function reactDefaults(): ViteUserConfig {
  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
    },
  }
}

/**
 * Returns the Vitest configuration for code that runs on Node.
 *
 * Pass only the settings that differ from the shared ones. They are merged
 * with `mergeConfig()` of Vitest, so arrays (such as `plugins` and
 * `setupFiles`) are added to the shared ones.
 *
 * @example
 * ```ts
 * import { defineVitestConfig } from '@shinju-date/config/vitest'
 *
 * export default defineVitestConfig()
 * ```
 */
export function defineVitestConfig(
  overrides: ViteUserConfig = {},
): ViteUserConfig {
  return mergeConfig(defaults, overrides)
}

/**
 * Returns the Vitest configuration for React components, which run in jsdom.
 *
 * @example
 * ```ts
 * import { defineVitestConfig } from '@shinju-date/config/vitest'
 *
 * export default defineVitestConfig.react({
 *   test: {
 *     setupFiles: ['./vitest.setup.ts'],
 *   },
 * })
 * ```
 */
defineVitestConfig.react = function defineReactVitestConfig(
  overrides: ViteUserConfig = {},
): ViteUserConfig {
  return defineVitestConfig(mergeConfig(reactDefaults(), overrides))
}
