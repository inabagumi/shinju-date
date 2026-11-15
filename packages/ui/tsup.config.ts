import { defineConfig } from 'tsup'

export default defineConfig({
  // Emit one module per source file instead of a single `dist/index.js`, so
  // that apps load only the components they import and each component's
  // Radix packages stay out of pages that do not use it. Transpiling each
  // file on its own also keeps `'use client'` at the top of the modules that
  // declare it.
  bundle: false,
  clean: true,
  dts: {
    compilerOptions: {
      ignoreDeprecations: '6.0',
    },
  },
  entry: ['./src/**/*.{ts,tsx}', '!./src/**/*.{stories,test}.{ts,tsx}'],
  format: 'esm',
  sourcemap: true,
  target: 'es2022',
})
