import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: true,
  entry: ['./src/index.ts', './src/testing/index.ts'],
  fixedExtension: false,
  format: 'esm',
  sourcemap: true,
  target: 'es2022',
})
