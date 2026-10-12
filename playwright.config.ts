import { defineConfig, devices } from "@playwright/test";

// End-to-end flows against a real app and a real Supabase stack (`supabase start`, then
// `pnpm db:migrate`). The app is built and started here unless one is already running on :3000.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // For environments with a preinstalled Chromium that doesn't match this Playwright version.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "pnpm build && pnpm start", url: "http://localhost:3000/login", reuseExistingServer: true, timeout: 180_000 },
});
