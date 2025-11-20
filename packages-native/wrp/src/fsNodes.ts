import { promises as fs } from "node:fs"
import path from "node:path"
import * as Effect from "effect/Effect"
import YAML from "yaml"
import { type AnyNode, type NodeKind } from "./model.js"

const boundaryPattern = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/

const kindDirectory = (kind: NodeKind): string => {
  switch (kind) {
    case "wish":
      return "wishes"
    case "prompt":
      return "prompts"
    case "observation":
      return "observations"
    case "decision":
      return "decisions"
    default:
      return "external"
  }
}

const parseMarkdown = (content: string): { frontmatter: Record<string, unknown>; body: string } => {
  const match = boundaryPattern.exec(content)

  if (!match) {
    return { frontmatter: {}, body: content.trimEnd() }
  }

  const [, frontmatterText, body] = match
  const parsed = YAML.parse(frontmatterText) as Record<string, unknown> | null

  return { frontmatter: parsed ?? {}, body: body.trimStart() }
}

const serializeMarkdown = (frontmatter: Record<string, unknown>, body: string): string => {
  const yaml = YAML.stringify(frontmatter, { lineWidth: 120 }).trimEnd()
  const normalizedBody = body.trimEnd()

  if (normalizedBody.length === 0) {
    return `---\n${yaml}\n---\n`
  }

  return `---\n${yaml}\n---\n\n${normalizedBody}\n`
}

const nodePath = (rootDir: string, promptgraphDir: string, kind: NodeKind, id: string) =>
  path.join(rootDir, promptgraphDir, "nodes", kindDirectory(kind), `${id}.md`)

const readFileEffect = (filePath: string) =>
  Effect.tryPromise({
    try: () => fs.readFile(filePath, "utf8"),
    catch: (error) => error as Error
  })

const writeFileEffect = (filePath: string, content: string) =>
  Effect.tryPromise({
    try: () => fs.writeFile(filePath, content, "utf8"),
    catch: (error) => error as Error
  })

const ensureDir = (dir: string) =>
  Effect.tryPromise({
    try: () => fs.mkdir(dir, { recursive: true }),
    catch: (error) => error as Error
  })

const walkMarkdownFiles = (
  directory: string
): Effect.Effect<Array<string>, Error> =>
  Effect.gen(function*() {
    const exists = yield* Effect.tryPromise({
      try: () => fs.access(directory).then(() => true).catch(() => false),
      catch: (error) => error as Error
    })

    if (!exists) {
      return []
    }

    const entries = yield* Effect.tryPromise({
      try: () => fs.readdir(directory, { withFileTypes: true }),
      catch: (error) => error as Error
    })

    const files: Array<string> = []

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        const nested = yield* walkMarkdownFiles(fullPath)
        files.push(...nested)
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath)
      }
    }

    return files
  })

export const parseNodeFile = (content: string): AnyNode => {
  const { frontmatter, body } = parseMarkdown(content)
  const node: AnyNode = {
    ...(frontmatter as AnyNode),
    body
  }
  return node
}

export const serializeNodeFile = (node: AnyNode): string => {
  const { body = "", ...rest } = node
  return serializeMarkdown(rest, body)
}

export const loadAllNodes = (
  rootDir: string,
  promptgraphDir: string
): Effect.Effect<Array<AnyNode>> =>
  Effect.gen(function*() {
    const nodesDir = path.join(rootDir, promptgraphDir, "nodes")
    const files = yield* walkMarkdownFiles(nodesDir)
    const parsed: Array<AnyNode> = []

    for (const file of files) {
      const content = yield* readFileEffect(file)
      parsed.push(parseNodeFile(content))
    }

    return parsed
  })

export const writeNode = (
  rootDir: string,
  promptgraphDir: string,
  node: AnyNode
): Effect.Effect<void> =>
  Effect.gen(function*() {
    const filePath = nodePath(rootDir, promptgraphDir, node.kind, node.id)
    const dir = path.dirname(filePath)
    yield* ensureDir(dir)
    const content = serializeNodeFile(node)
    yield* writeFileEffect(filePath, content)
  })

export const readNodeById = (
  rootDir: string,
  promptgraphDir: string,
  id: string
): Effect.Effect<AnyNode | undefined> =>
  Effect.gen(function*() {
    const nodes = yield* loadAllNodes(rootDir, promptgraphDir)
    return nodes.find((node) => node.id === id)
  })

export const nodeFilePath = (rootDir: string, promptgraphDir: string, node: AnyNode) =>
  nodePath(rootDir, promptgraphDir, node.kind, node.id)
