import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    environmentOptions: {
      url: 'https://shinju-date.test',
    },
    globals: true,
  },
})
