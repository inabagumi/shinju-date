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
  externals: {
    inline: [
      // Inline workspace packages by default
      /^@shinju-date\//,
    ],
  },
  imports: {
    dirs: ['lib/**'],
  },
  rollupConfig: {
    external: [
      // Externalize Sentry packages to avoid bundling issues
      '@sentry/node',
      '@sentry/nextjs',
      '@sentry/profiling-node',
      // Externalize Supabase to avoid module resolution issues
      '@supabase/supabase-js',
      '@supabase/sentry-js-integration',
    ],
  },
  srcDir: 'server',
})
