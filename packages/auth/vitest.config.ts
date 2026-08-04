import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    // No database and no network — unlike the service suites these need no
    // sequencing, so leave the defaults alone and let them run in parallel.
  },
})
