import { mergeConfig, type ViteUserConfig } from "vitest/config"
import shared from "../../vitest.shared.ts"

const config: ViteUserConfig = {
  test: {
    // Disable concurrent tests since we use shared global state (happy-dom window/document)
    sequence: {
      concurrent: false
    }
  }
}

export default mergeConfig(shared, config)
