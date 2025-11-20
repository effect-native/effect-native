import { promises as fs } from "node:fs"
import path from "node:path"
import * as Effect from "effect/Effect"

export type WrpConfig = {
  promptgraphDir: string
  targetsDir: string
}

export const defaultConfig: WrpConfig = {
  promptgraphDir: "promptgraph",
  targetsDir: "targets"
}

const readConfigFile = (configPath: string) =>
  Effect.tryPromise({
    try: () => fs.readFile(configPath, "utf8"),
    catch: (error) => error as Error
  })

export const loadConfig = (rootDir: string): Effect.Effect<WrpConfig> =>
  Effect.gen(function*() {
    const configPath = path.join(rootDir, "wrp.config.json")
    const exists = yield* Effect.tryPromise({
      try: () => fs.access(configPath).then(() => true).catch(() => false),
      catch: (error) => error as Error
    })

    if (!exists) {
      return defaultConfig
    }

    const content = yield* readConfigFile(configPath)
    const parsed = JSON.parse(content) as Partial<WrpConfig>

    return {
      ...defaultConfig,
      ...parsed
    }
  })

export const writeDefaultConfig = (rootDir: string, config: WrpConfig = defaultConfig) =>
  Effect.tryPromise({
    try: () => fs.writeFile(path.join(rootDir, "wrp.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8"),
    catch: (error) => error as Error
  })
