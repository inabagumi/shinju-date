import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: true,
  // Each entry is its own file, so the browser build (`./client`) does not
  // pull in the server code (`./server`), such as the profiler and MSW.
  entry: ['./src/server.ts', './src/client.ts', './src/next-config.ts'],
  fixedExtension: false,
  format: 'esm',
  sourcemap: true,
  target: 'es2022',
})
