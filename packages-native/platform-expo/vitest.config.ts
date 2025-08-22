import { mergeConfig, type ViteUserConfig } from "vitest/config"
import shared from "../../vitest.shared.js"

const config: ViteUserConfig = {
  test: {
    environment: "node",
    server: {
      deps: {
        external: ["react-native", "expo", "@react-native-async-storage/async-storage", "expo-file-system", "expo-secure-store"]
      }
    }
  }
}

export default mergeConfig(shared, config)
