import { promises as fs } from "node:fs"
import path from "node:path"
import * as Effect from "effect/Effect"
import YAML from "yaml"
import { type WrpConfig } from "./config.js"

export type TargetRepoConfig = {
  id: string
  remote: string
  localRoot: string
  defaultBranch: string
}

export type TargetsConfig = {
  repos: TargetRepoConfig[]
}

export const loadTargets = (
  rootDir: string,
  config: WrpConfig
): Effect.Effect<TargetsConfig> =>
  Effect.gen(function*() {
    const targetsDir = path.join(rootDir, config.targetsDir)
    const reposPath = path.join(targetsDir, "repos.yaml")

    const exists = yield* Effect.tryPromise({
      try: () => fs.access(reposPath).then(() => true).catch(() => false),
      catch: (error) => error as Error
    })

    if (!exists) {
      return { repos: [] }
    }

    const content = yield* Effect.tryPromise({
      try: () => fs.readFile(reposPath, "utf8"),
      catch: (error) => error as Error
    })

    const parsed = YAML.parse(content) as TargetsConfig | null
    if (!parsed || !Array.isArray(parsed.repos)) {
      return { repos: [] }
    }

    return { repos: parsed.repos }
  })
