import { defineConfig } from 'tsup'

export default defineConfig({
  dts: true,
  entry: [
    './src/index.ts',
    './src/browser.ts',
    './src/server.ts',
    './src/register.ts',
    './src/next-config.ts',
  ],
  format: 'esm',
  sourcemap: true,
  target: 'es2022',
})
