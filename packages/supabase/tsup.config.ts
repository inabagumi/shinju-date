import { defineConfig } from 'tsup'

export default defineConfig({
  dts: true,
  entry: ['./src/index.ts', './src/middleware.ts', './src/server.ts'],
  format: 'esm',
  sourcemap: true,
  target: 'es2022'
})
