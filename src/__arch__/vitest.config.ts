import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/__arch__/**/*.test.ts'],
    globals: true,
  },
})
