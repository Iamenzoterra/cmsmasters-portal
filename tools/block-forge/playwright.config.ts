import { defineConfig, devices } from '@playwright/test'

// Use a dedicated port for e2e so a developer's local dev server (which uses
// the default sandbox dir) can keep running on 7702 without interfering. CI
// gets a fresh box anyway, so port choice is incidental there.
const PORT = 7799
const FIXTURES_DIR = 'e2e/fixtures'

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort --host 127.0.0.1`,
    cwd: './',
    url: `http://localhost:${PORT}`,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    env: {
      BLOCK_FORGE_SOURCE_DIR: FIXTURES_DIR,
    },
  },
})
