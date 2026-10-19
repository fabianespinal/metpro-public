import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests for the public viewer's pure helpers. No browser, no backend.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
