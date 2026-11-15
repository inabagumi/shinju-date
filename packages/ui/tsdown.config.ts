import { defineConfig } from 'tsdown'

export default defineConfig({
  // Rolldown warns that `'use client'` may not survive bundling. With
  // `unbundle` every source file stays its own module, so the directive is
  // kept, and the warning does not apply.
  checks: {
    moduleLevelDirective: false,
  },
  dts: true,
  entry: ['./src/**/*.{ts,tsx}', '!./src/**/*.{stories,test}.{ts,tsx}'],
  fixedExtension: false,
  format: 'esm',
  sourcemap: true,
  target: 'es2022',
  // Emit one module per source file instead of a single `dist/index.js`, so
  // that apps load only the components they import and each component's
  // Radix packages stay out of pages that do not use it. Keeping each file as
  // its own module also keeps `'use client'` at the top of the modules that
  // declare it.
  unbundle: true,
})
