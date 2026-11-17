import { definePackageConfig } from '@shinju-date/config/tsdown'

export default definePackageConfig({
  deps: {
    // `@faker-js/faker` is a dev dependency, so it is bundled into `dist/`.
    // Listing it here makes the build fail if any other package from
    // `node_modules` ends up in the bundle.
    onlyBundle: ['@faker-js/faker'],
  },
  entry: [
    './src/index.ts',
    './src/server.ts',
    './src/session.ts',
    './src/register.ts',
  ],
})
