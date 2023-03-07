import { defineConfig } from 'tsup'

export default defineConfig({
  banner: {
    js: "'use client'"
  },
  dts: true,
  entry: ['./src/index.ts'],
  format: 'cjs',
  target: 'es2022'
})
