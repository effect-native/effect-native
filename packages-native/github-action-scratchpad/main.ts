/**
 * GitHub Action Test - @effect-native/platform-github
 *
 * Tests the core functionality on pull_request events:
 * - Console.log routes to GitHub Actions UI automatically
 * - ActionContext provides event/repo context
 * - ActionClient provides GitHub API access
 * - Type-safe inputs with Schema validation
 */
import { Action, ActionContext, ActionRunner, GithubToken, Input, PR } from "@effect-native/platform-github"
import { Console, Effect, Layer } from "effect"

const program = Effect.gen(function*() {
  // ─────────────────────────────────────────────────────────────────────────────
  // Console.log just works - routes to GitHub Actions UI via ConsoleGitHubActions
  // ─────────────────────────────────────────────────────────────────────────────
  yield* Console.log("Starting Effect GitHub Action test...")

  // ─────────────────────────────────────────────────────────────────────────────
  // Type-safe inputs with Schema validation
  // ─────────────────────────────────────────────────────────────────────────────
  const verbose = yield* Input.boolean("verbose").pipe(Effect.orElseSucceed(() => false))

  // ─────────────────────────────────────────────────────────────────────────────
  // ActionContext - works for any event type
  // ─────────────────────────────────────────────────────────────────────────────
  const ctx = yield* ActionContext.ActionContext
  const repoCtx = yield* ctx.repo

  yield* Console.log(`Event: ${ctx.eventName}`)
  yield* Console.log(`Repo: ${repoCtx.owner}/${repoCtx.repo}`)
  yield* Console.log(`Actor: ${ctx.actor}`)
  yield* Console.log(`SHA: ${ctx.sha.slice(0, 7)}`)
  yield* Console.log(`Ref: ${ctx.ref}`)

  // ─────────────────────────────────────────────────────────────────────────────
  // PR service - only used when event is pull_request
  // ─────────────────────────────────────────────────────────────────────────────
  if (ctx.eventName === "pull_request") {
    const prNumber = yield* PR.number
    const headRef = yield* PR.headRef
    const baseRef = yield* PR.baseRef
    const files = yield* PR.files
    const draft = yield* PR.draft

    yield* Console.log(`PR #${prNumber}: ${headRef} → ${baseRef}`)
    yield* Console.log(`Files changed: ${files.length}${draft ? " (draft)" : ""}`)

    if (verbose) {
      for (const file of files.slice(0, 5)) {
        yield* Console.log(`  ${file.status}: ${file.filename}`)
      }
      if (files.length > 5) {
        yield* Console.log(`  ... and ${files.length - 5} more`)
      }
    }

    // Set outputs
    yield* ActionRunner.setOutput("pr-number", String(prNumber))
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Set outputs and finish
  // ─────────────────────────────────────────────────────────────────────────────
  yield* ActionRunner.setOutput("repo", `${repoCtx.owner}/${repoCtx.repo}`)
  yield* ActionRunner.setOutput("sha", ctx.sha)
  yield* ActionRunner.setOutput("actor", ctx.actor)
  yield* ActionRunner.setOutput("event", ctx.eventName)
  yield* ActionRunner.notice("Effect GitHub Action completed!", { title: "Success" })
})

// Build the layer:
// 1. Action.Default provides ActionRequirements but requires GithubToken
// 2. PR.Default provides PR service but requires ActionContext and ActionClient
// 3. GithubToken.layer provides the token from env
// We need to provide GithubToken to both Action.Default and PR.Default's dependencies
const FullLayer = Layer.mergeAll(
  Action.Default,
  PR.Default
).pipe(
  Layer.provide(GithubToken.layer)
)

// Run the program with all dependencies satisfied
Effect.runPromise(Effect.provide(program, FullLayer)).catch((e) => {
  console.error(e)
  process.exit(1)
})
