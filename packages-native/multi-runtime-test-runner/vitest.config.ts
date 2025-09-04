/// <reference types="vitest" />
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    setupFiles: ["../../vitest.setup.ts"],
    globals: true,
    reporters: ["verbose"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/internal/**/*.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  },
  resolve: {
    alias: {
      "@effect-native/multi-runtime-test-runner": path.join(__dirname, "src/index.ts"),
      "effect": path.join(__dirname, "../../packages/effect/src"),
      "@effect/platform": path.join(__dirname, "../../packages/platform/src"),
      "@effect/platform-node": path.join(__dirname, "../../packages/platform-node/src"),
      "@effect/vitest": path.join(__dirname, "../../packages/vitest/src")
    }
  }
})