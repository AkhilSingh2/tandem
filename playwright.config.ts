import { defineConfig, devices } from "@playwright/test";

const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://127.0.0.1:1234";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npx tsx server/index.ts",
      url: "http://127.0.0.1:1234/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        ...process.env,
        WS_HOST: "0.0.0.0",
        WS_PORT: "1234",
        DATABASE_PATH: "./data/e2e.sqlite",
      },
    },
    {
      command: "npm run start",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_WS_URL: wsUrl,
      },
    },
  ],
});
