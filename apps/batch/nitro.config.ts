import { fileURLToPath } from 'node:url'

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
  imports: {
    dirs: ['lib/**'],
  },
  srcDir: 'server',
})
