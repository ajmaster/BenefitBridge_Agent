import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: ".venv/bin/python -m uvicorn app.fast_api_app:app --host 127.0.0.1 --port 8000",
      url: "http://127.0.0.1:8000/healthz",
      cwd: "..",
      env: { ENABLE_LLM_CHAT: "false", UV_CACHE_DIR: ".uv-cache" },
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      url: "http://127.0.0.1:3000",
      env: { NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8000" },
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
