import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:7101',
    viewport: { width: 1440, height: 900 },
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: process.env.PREVIEW_MODE === 'dev'
      ? 'npm run dev -- --host 127.0.0.1 --port 7101'
      : 'python3 -m http.server 7101 --bind 127.0.0.1 --directory dist',
    url: 'http://127.0.0.1:7101',
    reuseExistingServer: false,
    timeout: 15_000,
  },
})
