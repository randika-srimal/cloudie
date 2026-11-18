import { defineConfig, devices } from '@playwright/test';

// Runs in the Playwright container on the dev container's network (./cli.sh e2e), so
// localhost:5173 is the Vite dev server and /api reaches the Pages Functions.
export default defineConfig({
  testDir: './tests',
  outputDir: '../test-results/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
