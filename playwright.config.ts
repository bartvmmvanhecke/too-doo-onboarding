import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3200);

/** End-to-end-controle van alle routes en demo-uitkomsten. Draai met `npm run test:e2e` (na `npm run build`). */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "nl-BE",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testIgnore: /responsive\.spec\.ts/,
    },
    { name: "mobiel", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
  },
});
