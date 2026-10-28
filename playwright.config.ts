import {defineConfig} from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: {timeout: 10000},
  outputDir: ".work/browser-results",
  reporter: [["list"], ["json", {outputFile: ".work/browser-results.json"}]],
  use: {baseURL: "http://127.0.0.1:4320", trace: "retain-on-failure"},
  projects: [
    ...["chromium", "firefox", "webkit"].flatMap(browserName => [
      {name: `${browserName}-desktop`, use: {browserName: browserName as "chromium" | "firefox" | "webkit", viewport: {width: 1100, height: 850}, deviceScaleFactor: 1}},
      {name: `${browserName}-mobile-size`, use: {browserName: browserName as "chromium" | "firefox" | "webkit", viewport: {width: 430, height: 932}, deviceScaleFactor: 2, hasTouch: true}},
    ]),
    ...(process.env.ATMOS_WEBKIT_EXECUTABLE ? [{name: "webkit-comparison", use: {browserName: "webkit" as const, viewport: {width: 430, height: 932}, deviceScaleFactor: 2, launchOptions: {executablePath: process.env.ATMOS_WEBKIT_EXECUTABLE}}}] : []),
  ],
  webServer: {command: "pnpm dev:compat", url: "http://127.0.0.1:4320", reuseExistingServer: !process.env.CI},
});
