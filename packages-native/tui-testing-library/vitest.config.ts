import { defineConfig } from "vitest/config"

// Dummy Vitest config to satisfy root workspace runner.
// Tests in this package use bun:test and are executed with `bun test`, not Vitest.
export default defineConfig({
  test: {
    include: ["vitest.dummy.test.ts"],
  },
})
