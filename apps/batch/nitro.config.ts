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
  compatibilityDate: '2025-07-15',
  experimental: {
    openAPI: true,
  },
  imports: {
    dirs: ['lib/**'],
  },
  minify: false,
  preset: 'vercel',
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
