import { Args, Command, HelpDoc, Options } from "@effect/cli"
import * as CliConfig from "@effect/cli/CliConfig"
import { NodeContext } from "@effect/platform-node"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { addWish, evaluateManual, findNode, initWorkspace, listNodes, printTable } from "./core.js"
import { loadConfig } from "./config.js"
import packageJson from "../package.json" with { type: "json" }
import { runEvaluationPrompt, runInputPrompt, showNodeDetails } from "./interactive.js"
import { loadTargets } from "./targets.js"
import { openInEditor } from "./editor.js"

const version = packageJson.version as string

const initCommand = Command.make("init", {}, () =>
  Effect.gen(function*() {
    const cwd = process.cwd()
    const result = yield* initWorkspace(cwd)
    if (result.created.length === 0) {
      yield* Console.log("No changes needed. Workspace already initialized.")
      return
    }
    yield* Console.log("Created:")
    for (const entry of result.created) {
      yield* Console.log(`- ${entry}`)
    }
  })).pipe(
  Command.withDescription(HelpDoc.p("Initialize the local promptgraph workspace"))
)

const addWishCommand = Command.make(
  "wish",
  {
    title: Args.optional(Args.text({ name: "title" })),
    tags: Options.repeated(Options.text("tag"))
  },
  ({ title, tags }) =>
    Effect.gen(function*() {
      const resolvedTitle = yield* Option.match(title, {
        onSome: (value) => Effect.succeed(value),
        onNone: () => runInputPrompt("Enter a title for the wish:")
      })
      const resolvedTags = tags
      const { wish, filePath } = yield* addWish(process.cwd(), resolvedTitle, resolvedTags)
      yield* Console.log(`Created wish ${wish.id}`)
      yield* Console.log(`Path: ${filePath}`)
      const editor = process.env.EDITOR
      if (editor && editor.length > 0) {
        yield* Console.log(`Opening in ${editor}...`)
        yield* openInEditor(editor, filePath)
      }
    })
).pipe(
  Command.withDescription(HelpDoc.p("Create a new wish node"))
)

const addCommand = Command.make("add").pipe(
  Command.withDescription(HelpDoc.p("Add nodes to the promptgraph")),
  Command.withSubcommands([addWishCommand])
)

const listCommand = Command.make(
  "list",
  {
    kind: Options.text("kind").pipe(Options.withDefault("wish")),
    tag: Options.optional(Options.text("tag")),
    status: Options.optional(Options.text("status"))
  },
  ({ kind, tag, status }) =>
    Effect.gen(function*() {
      const nodes = yield* listNodes(process.cwd(), {
        kind,
        tag: Option.getOrUndefined(tag),
        status: Option.getOrUndefined(status)
      })
      yield* printTable(nodes)
    })
).pipe(
  Command.withDescription(HelpDoc.p("List nodes filtered by kind, tag, or status"))
)

const showCommand = Command.make(
  "show",
  {
    id: Args.text({ name: "id" })
  },
  ({ id }) =>
    Effect.gen(function*() {
      const node = yield* findNode(process.cwd(), id)
      if (!node) {
        yield* Console.log(`No node found with id ${id}`)
        const suggestions = yield* listNodes(process.cwd(), {})
        const nearMatches = suggestions
          .filter((candidate) => candidate.id.includes(id))
          .map((candidate) => candidate.id)
        if (nearMatches.length > 0) {
          yield* Console.log("Did you mean:")
          for (const suggestion of nearMatches) {
            yield* Console.log(`- ${suggestion}`)
          }
        }
        return
      }
      yield* showNodeDetails(node)
    })
).pipe(
  Command.withDescription(HelpDoc.p("Display a node with its frontmatter and body"))
)

const evalCommand = Command.make(
  "eval",
  {
    id: Args.text({ name: "id" })
  },
  ({ id }) =>
    Effect.gen(function*() {
      const node = yield* findNode(process.cwd(), id)
      if (!node) {
        yield* Console.log(`No node found with id ${id}`)
        return
      }

      if (!node.evaluation) {
        yield* Console.log("No evaluation spec defined.")
        return
      }

      if (node.evaluation.reproLevel !== "manual-human") {
        yield* Console.log("Only manual-human evaluations are supported in this version.")
        return
      }

      yield* runEvaluationPrompt(node)
      const response = yield* runInputPrompt("Did this claim pass? (y/n/i)")
      const decision = response.trim().toLowerCase()
      if (decision !== "y" && decision !== "n" && decision !== "i") {
        yield* Console.log("Invalid response. Expected y, n, or i.")
        return
      }

      const { updated, logPath } = yield* evaluateManual(process.cwd(), node, decision as "y" | "n" | "i")
      yield* Console.log(`Updated claimStatus to ${updated.claimStatus}`)
      yield* Console.log(`Logged run to ${logPath}`)
    })
).pipe(
  Command.withDescription(HelpDoc.p("Run a manual-human evaluation for a node"))
)

const repoListCommand = Command.make("list", {}, () =>
  Effect.gen(function*() {
    const config = yield* loadConfig(process.cwd())
    const targets = yield* loadTargets(process.cwd(), config)
    if (targets.repos.length === 0) {
      yield* Console.log("No target repositories configured.")
      return
    }
    for (const repo of targets.repos) {
      yield* Console.log(`${repo.id}: ${repo.remote} (${repo.localRoot}) [${repo.defaultBranch}]`)
    }
  })
).pipe(
  Command.withDescription(HelpDoc.p("List configured external repositories"))
)

const repoCommand = Command.make("repo").pipe(
  Command.withDescription(HelpDoc.p("Manage repository mappings")),
  Command.withSubcommands([repoListCommand])
)

export const wrpCommand = Command.make("wrp").pipe(
  Command.withDescription(HelpDoc.p("Wish/wrapper CLI")),
  Command.withSubcommands([
    initCommand,
    addCommand,
    listCommand,
    showCommand,
    evalCommand,
    repoCommand
  ])
)

export const cliLayers = Layer.mergeAll(
  CliConfig.layer({ showBuiltIns: false }),
  NodeContext.layer
)

export const wrpCli = Command.run(wrpCommand, {
  name: "wrp",
  version,
  summary: HelpDoc.p("Lightweight wish/wrapper control plane")
})
