import {defineConfig, devices} from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ?
    [
      ["html", {open: "never"}],
      ["github"],
      ["junit", {outputFile: "reports/junit.xml"}],
    ] :
    "html",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // ── VRT: スクリーンショット取得（3デバイス × visual.spec.ts のみ）───
    {
      name: "desktop",
      testMatch: "**/visual.spec.ts",
      use: {...devices["Desktop Chrome"]},
    },
    {
      name: "tablet",
      testMatch: "**/visual.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: {width: 768, height: 1024},
      },
    },
    {
      name: "mobile",
      testMatch: "**/visual.spec.ts",
      use: {...devices["iPhone 15"]},
    },
    // ── E2E: UIインタラクションテスト（e2e.spec.ts のみ、デスクトップ）──
    {
      name: "e2e",
      testMatch: "**/e2e.spec.ts",
      use: {...devices["Desktop Chrome"]},
    },
  ],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
