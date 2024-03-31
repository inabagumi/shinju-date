import { defineConfig } from 'tsup'

export default defineConfig({
  dts: true,
  entry: [
    './src/index.ts',
    './src/max.ts',
    './src/min.ts',
    './src/start-of-hour.ts'
  ],
  format: 'esm',
  sourcemap: true,
  target: 'es2022'
})
