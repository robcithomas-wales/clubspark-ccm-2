import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    testTimeout: 30_000,
    // Run all integration tests in a single worker to avoid concurrent DB writes
    pool: 'forks',
    singleFork: true,
  },
})
