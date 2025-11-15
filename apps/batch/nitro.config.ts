import { defineNitroConfig } from 'nitropack/config'
import { fileURLToPath } from 'node:url'

export default defineNitroConfig({
  preset: 'vercel',
  srcDir: 'server',
  output: {
    dir: '.output',
    serverDir: '.output/server',
    publicDir: '.output/public',
  },
  serverAssets: [
    {
      baseName: 'server',
      dir: './server/assets',
    },
  ],
  compatibilityDate: '2025-01-01',
  experimental: {
    openAPI: true,
  },
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        moduleResolution: 'bundler',
        module: 'ESNext',
        target: 'ESNext',
      },
    },
  },
  imports: {
    dirs: ['lib/**'],
  },
  alias: {
    '@': fileURLToPath(new URL('./', import.meta.url)),
    '@shinju-date/youtube-api-client': fileURLToPath(new URL('../../packages/youtube-api-client/src/index.ts', import.meta.url)),
  },
  minify: false,
})
