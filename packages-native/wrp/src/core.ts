import { promises as fs } from "node:fs"
import path from "node:path"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Random from "effect/Random"
import { defaultConfig, loadConfig, type WrpConfig, writeDefaultConfig } from "./config.js"
import { loadAllNodes, nodeFilePath, readNodeById, writeNode } from "./fsNodes.js"
import { type AnyNode, type ClaimStatus, type WishNode } from "./model.js"

const fileExists = (filePath: string) =>
  Effect.tryPromise({
    try: () => fs.access(filePath).then(() => true).catch(() => false),
    catch: (error) => error as Error
  })

const ensureDir = (dir: string) =>
  Effect.tryPromise({
    try: () => fs.mkdir(dir, { recursive: true }),
    catch: (error) => error as Error
  })

const writeFile = (filePath: string, content: string) =>
  Effect.tryPromise({
    try: () => fs.writeFile(filePath, content, "utf8"),
    catch: (error) => error as Error
  })

const defaultManualEvaluation = {
  reproLevel: "manual-human" as const,
  manual: {
    timeBudgetMinutes: 5,
    difficulty: "easy" as const,
    steps: [
      {
        description: "Later, decide whether this wish has been meaningfully addressed.",
        expected: "You can honestly say yes or no."
      }
    ]
  }
}

const rootWish = (): WishNode => ({
  id: "w-use-system-tomorrow",
  kind: "wish",
  title: "Use this system to help my day job tomorrow morning",
  status: "unspecified",
  claimKind: "wish",
  claimStatus: "unexamined",
  tags: ["work", "tomorrow"],
  deps: [],
  evaluation: {
    reproLevel: "manual-human",
    manual: {
      timeBudgetMinutes: 5,
      difficulty: "easy",
      steps: [
        {
          description: "At the end of the morning, list tasks done and note whether any were directly helped by WRP.",
          expected: "At least one real task is helped by this system."
        }
      ]
    }
  },
  body: "Freeform notes about how this wish should work."
})

const kebabCase = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

const randomSuffix = Effect.gen(function*() {
  const n = yield* Random.nextInt
  const normalized = Math.abs(n % 1679616)
  return normalized.toString(36).padStart(4, "0")
})

const ensureLayout = (rootDir: string, config: WrpConfig) =>
  Effect.gen(function*() {
    const created: string[] = []
    const promptgraphRoot = path.join(rootDir, config.promptgraphDir)
    const targetsRoot = path.join(rootDir, config.targetsDir)

    const requiredDirs = [
      promptgraphRoot,
      path.join(promptgraphRoot, "nodes"),
      path.join(promptgraphRoot, "nodes", "wishes"),
      path.join(promptgraphRoot, "nodes", "prompts"),
      path.join(promptgraphRoot, "nodes", "observations"),
      path.join(promptgraphRoot, "nodes", "decisions"),
      path.join(promptgraphRoot, "nodes", "external"),
      path.join(promptgraphRoot, "generated"),
      path.join(promptgraphRoot, "generated", "specs"),
      path.join(promptgraphRoot, "generated", "notes"),
      path.join(promptgraphRoot, "runs"),
      targetsRoot
    ]

    for (const dir of requiredDirs) {
      const exists = yield* fileExists(dir)
      if (!exists) {
        yield* ensureDir(dir)
        created.push(dir)
      }
    }

    const reposPath = path.join(targetsRoot, "repos.yaml")
    const reposExists = yield* fileExists(reposPath)
    if (!reposExists) {
      yield* writeFile(reposPath, "repos: []\n")
      created.push(reposPath)
    }

    return created
  })

const wishesExist = (rootDir: string, config: WrpConfig) =>
  Effect.gen(function*() {
    const wishesDir = path.join(rootDir, config.promptgraphDir, "nodes", "wishes")
    const exists = yield* fileExists(wishesDir)
    if (!exists) {
      return false
    }

    const entries = yield* Effect.tryPromise({
      try: () => fs.readdir(wishesDir),
      catch: (error) => error as Error
    })

    return entries.some((entry) => entry.endsWith(".md"))
  })

export const initWorkspace = (rootDir: string) =>
  Effect.gen(function*() {
    const configPath = path.join(rootDir, "wrp.config.json")
    const configExists = yield* fileExists(configPath)
    const config = configExists ? yield* loadConfig(rootDir) : defaultConfig

    const created = yield* ensureLayout(rootDir, config)

    if (!configExists) {
      yield* writeDefaultConfig(rootDir, config)
      created.push(configPath)
    }

    const hasWishes = yield* wishesExist(rootDir, config)
    let initialWishPath: string | undefined
    if (!hasWishes) {
      const wish = rootWish()
      yield* writeNode(rootDir, config.promptgraphDir, wish)
      initialWishPath = nodeFilePath(rootDir, config.promptgraphDir, wish)
      created.push(initialWishPath)
    }

    return { created, initialWishPath }
  })

export const addWish = (
  rootDir: string,
  title: string,
  tags: Array<string> = []
) =>
  Effect.gen(function*() {
    const config = yield* loadConfig(rootDir)
    const suffix = yield* randomSuffix
    const slug = kebabCase(title) || "wish"
    const id = `w-${slug}-${suffix}`

    const wish: WishNode = {
      id,
      kind: "wish",
      title,
      status: "unspecified",
      claimKind: "wish",
      claimStatus: "unexamined",
      tags: tags.length > 0 ? tags : undefined,
      deps: [],
      evaluation: defaultManualEvaluation
    }

    yield* writeNode(rootDir, config.promptgraphDir, wish)
    const filePath = nodeFilePath(rootDir, config.promptgraphDir, wish)

    return { wish, filePath }
  })

export const listNodes = (
  rootDir: string,
  filters: { kind?: string; tag?: string; status?: string }
) =>
  Effect.gen(function*() {
    const config = yield* loadConfig(rootDir)
    const nodes = yield* loadAllNodes(rootDir, config.promptgraphDir)
    const filtered = nodes.filter((node) => {
      if (filters.kind && node.kind !== filters.kind) {
        return false
      }
      if (filters.tag && !(node.tags ?? []).includes(filters.tag)) {
        return false
      }
      if (filters.status && node.kind === "wish") {
        return (node as WishNode).status === filters.status
      }
      if (filters.status && node.kind !== "wish") {
        return false
      }
      return true
    })

    return filtered
  })

export const findNode = (
  rootDir: string,
  id: string
) =>
  Effect.gen(function*() {
    const config = yield* loadConfig(rootDir)
    const node = yield* readNodeById(rootDir, config.promptgraphDir, id)
    return node
  })

export const updateClaimStatus = (
  rootDir: string,
  node: AnyNode,
  status: ClaimStatus
) =>
  Effect.gen(function*() {
    const config = yield* loadConfig(rootDir)
    const updated: AnyNode = { ...node, claimStatus: status }
    yield* writeNode(rootDir, config.promptgraphDir, updated)
    return updated
  })

const logRun = (
  rootDir: string,
  config: WrpConfig,
  entry: string
) =>
  Effect.gen(function*() {
    const runsDir = path.join(rootDir, config.promptgraphDir, "runs")
    yield* ensureDir(runsDir)
    const now = new Date()
    const dateStamp = now.toISOString().slice(0, 10)
    const logPath = path.join(runsDir, `${dateStamp}.log`)
    const line = `${now.toISOString()} ${entry}\n`
    yield* Effect.tryPromise({
      try: () => fs.appendFile(logPath, line, "utf8"),
      catch: (error) => error as Error
    })
    return logPath
  })

export const evaluateManual = (
  rootDir: string,
  node: AnyNode,
  decision: "y" | "n" | "i"
) =>
  Effect.gen(function*() {
    const config = yield* loadConfig(rootDir)
    const previous = node.claimStatus ?? "unexamined"
    const claimStatus: ClaimStatus = decision === "y"
      ? "supported"
      : decision === "n"
      ? "falsified"
      : "inconclusive"

    const updated = { ...node, claimStatus }
    yield* writeNode(rootDir, config.promptgraphDir, updated)
    const logPath = yield* logRun(
      rootDir,
      config,
      `${node.id} ${previous} -> ${claimStatus}`
    )

    return { updated, logPath }
  })

export const formatNodeSummary = (node: AnyNode): string => {
  const parts = [
    node.id.padEnd(26, " "),
    node.kind.padEnd(6, " "),
    node.kind === "wish" ? (node as WishNode).status.padEnd(12, " ") : "".padEnd(12, " "),
    (node.tags ?? []).join(",")
  ]

  return parts.join(" ")
}

export const printTable = (nodes: Array<AnyNode>) =>
  Effect.gen(function*() {
    yield* Console.log("id                          kind   status        tags")
    for (const node of nodes) {
      yield* Console.log(formatNodeSummary(node))
    }
  })
