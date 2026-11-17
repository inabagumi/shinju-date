import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // The tests also run on real Redis through Serverless Redis HTTP
    // (`test/redis.ts`), which runs transactions (`/multi-exec`) sent at the
    // same time on one connection and mixes them up ("MULTI calls can not be
    // nested"). The test files run one at a time so that they do not.
    fileParallelism: false,
    globals: true,
  },
})
