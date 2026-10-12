import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Unit tests (lib/**). De end-to-end-tests draaien met Playwright in e2e/. */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { include: ["lib/**/*.test.ts"], environment: "node" },
});
