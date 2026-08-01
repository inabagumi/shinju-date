import { defineConfig } from 'tsup'

export default defineConfig({
  dts: {
    compilerOptions: {
      ignoreDeprecations: '6.0',
    },
  },
  entry: [
    './src/index.ts',
    './src/browser.ts',
    './src/server.ts',
    './src/register.ts',
    './src/adapter.ts',
  ],
  format: 'esm',
  sourcemap: true,
  target: 'es2022',
})
