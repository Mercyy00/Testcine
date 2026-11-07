import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4173", headless: true, trace: "retain-on-failure" },
  webServer: [
    { command: "node tests/browser/media-server.mjs", url: "http://127.0.0.1:4174/health", timeout: 120000 },
    { command: "npm run dev -- --hostname 127.0.0.1 --port 4173", url: "http://127.0.0.1:4173",
      timeout: 120000, env: {
        VIVARIUM_TEST_BUILD: "1",
        STREAM_BOREAS_ORIGIN: "http://127.0.0.1:4174/boreas",
        STREAM_KRATOS_ORIGIN: "http://127.0.0.1:4174/kratos",
        STREAM_ZEUS_ORIGIN: "http://127.0.0.1:4174/zeus",
        STREAM_BOREAS_STATUS: "online", STREAM_KRATOS_STATUS: "online", STREAM_ZEUS_STATUS: "offline",
        STREAM_DEFAULT_SERVER: "boreas",
      } },
  ],
});
