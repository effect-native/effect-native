import * as path from "node:path"
import type { UserConfig } from "vitest/config"

const config: UserConfig = {
  test: {
    include: ["test/**/*.test.ts"],
    globals: true
  },
  resolve: {
    alias: {
      "@effect-native/platform-demo": path.join(__dirname, "src")
    }
  }
}

export default config
