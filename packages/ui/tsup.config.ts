import { defineConfig } from 'tsup'

export default defineConfig({
  dts: {
    compilerOptions: {
      ignoreDeprecations: '6.0',
    },
  },
  entry: ['./src/index.ts'],
  external: ['react', 'react-dom'],
  format: 'esm',
  sourcemap: true,
  target: 'es2022',
})
