import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const nextPort = 3001;
const backendPort = 8000;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${nextPort}`,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command:
        "uv run --with fastapi --with uvicorn uvicorn backend.main:app --host 127.0.0.1 --port 8000",
      url: "http://127.0.0.1:8000/docs",
      reuseExistingServer: !isCI,
    },
    {
      command: "pnpm exec next dev -p 3001",
      url: `http://127.0.0.1:${nextPort}`,
      reuseExistingServer: !isCI,
      env: {
        ...process.env,
        ADMIN_BACKEND_URL: `http://127.0.0.1:${backendPort}`,
        ADMIN_BACKEND_TOKEN: "demo-token",
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
