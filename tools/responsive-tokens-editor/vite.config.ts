/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7703,
    strictPort: true,
  },
  test: {
    // Vitest mocks .css imports as empty strings by default, which breaks
    // `?raw` imports in Phase 4 generator tests. `css: true` processes CSS
    // through Vite's pipeline so `?raw` returns the actual file content.
    // (saved memory feedback_vitest_css_raw + infra-tooling SKILL trap)
    css: true,
    // Phase 3: hooks @testing-library/jest-dom matchers into expect.
    // Per-file `// @vitest-environment jsdom` directive on component tests
    // (PF.7 — block-forge precedent; do NOT set environment globally).
    setupFiles: ['./src/setupTests.ts'],
  },
})
