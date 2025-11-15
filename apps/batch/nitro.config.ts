import { fileURLToPath } from 'node:url'
import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  alias: {
    '@': fileURLToPath(new URL('./', import.meta.url)),
    '@shinju-date/youtube-api-client': fileURLToPath(
      new URL(
        '../../packages/youtube-api-client/src/index.ts',
        import.meta.url,
      ),
    ),
  },
  compatibilityDate: '2025-01-01',
  experimental: {
    openAPI: true,
  },
  imports: {
    dirs: ['lib/**'],
  },
  minify: false,
  output: {
    dir: '.output',
    publicDir: '.output/public',
    serverDir: '.output/server',
  },
  preset: 'vercel',
  serverAssets: [
    {
      baseName: 'server',
      dir: './server/assets',
    },
  ],
  srcDir: 'server',
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        module: 'ESNext',
        moduleResolution: 'bundler',
        target: 'ESNext',
      },
    },
  },
})
