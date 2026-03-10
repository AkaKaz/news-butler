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
    {
      name: "desktop",
      use: {...devices["Desktop Chrome"]},
    },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: {width: 768, height: 1024},
      },
    },
    {
      name: "mobile",
      use: {...devices["Pixel 5"]},
    },
  ],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
