import { mergeConfig, type ViteUserConfig } from "vitest/config"
import shared from "../../vitest.shared.js"
import * as LibCrSql from "../libcrsql/src"

// Ensure CRSQLITE_PATH is available for tests by resolving via libcrsql.
process.env.CRSQLITE_PATH ??= LibCrSql.pathToCrSqliteExtension

const config: ViteUserConfig = {
  test: {
    testTimeout: 30000,
    pool: "forks"
  }
}

export default mergeConfig(shared, config)
