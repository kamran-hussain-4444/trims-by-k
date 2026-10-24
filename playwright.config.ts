import { defineConfig, devices } from "@playwright/test";

// Browser tests. Local by default (starts the dev server); point at the live site with
//   PW_BASE_URL=https://trimsbyk.co.uk npx playwright test
try {
  process.loadEnvFile(".env.local");
} catch {}

const BASE = process.env.PW_BASE_URL ?? "http://localhost:3100";
const local = BASE.includes("localhost");

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  // Booking tests share one real diary, so run one at a time.
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalTeardown: "./tests/e2e/teardown.ts",
  use: { baseURL: BASE, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /(layout|a11y)\.spec\.ts/ },
  ],
  // Tests a real production build, like the live site (the dev server's live-reload never goes idle).
  webServer: local
    ? {
        command: "npm run build && npx next start -p 3100",
        url: BASE,
        reuseExistingServer: false,
        timeout: 300_000,
        env: { CHAT_DAILY_LIMIT: "1000" },
      }
    : undefined,
});
