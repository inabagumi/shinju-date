import { defineConfig } from 'tsup'

export default defineConfig({
  clean: true,
  dts: {
    compilerOptions: {
      ignoreDeprecations: '6.0',
    },
  },
  entry: {
    index: './src/index.ts',
    twitch: './src/twitch/index.ts',
    youtube: './src/youtube/index.ts',
  },
  format: 'esm',
  sourcemap: true,
  target: 'es2022',
})
