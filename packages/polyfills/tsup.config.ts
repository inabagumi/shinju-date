import { defineConfig } from 'tsup'

export default defineConfig({
  dts: true,
  entry: ['./src/array.ts', './src/encoding.ts', './src/index.ts'],
  format: 'esm',
  target: 'es2022'
})
