import { defineConfig } from 'tsup'

export default defineConfig({
  dts: {
    compilerOptions: {
      ignoreDeprecations: '6.0',
    },
  },
  entry: ['./src/index.ts'],
  format: 'esm',
  sourcemap: true,
  target: 'es2022',
})
