import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: true,
  entry: {
    index: './src/index.ts',
    twitch: './src/twitch/index.ts',
    youtube: './src/youtube/index.ts',
  },
  fixedExtension: false,
  format: 'esm',
  sourcemap: true,
  target: 'es2022',
})
