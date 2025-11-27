/**
 * Main entry point for the GitHub Action Demo
 *
 * This file demonstrates @effect-native/platform-github for building
 * GitHub Actions with Effect. Runs on Node.js 24 with native TypeScript support.
 */
import {
  Action,
  ActionClient,
  ActionContext,
  ActionRunner,
  Input,
  PR
} from "@effect-native/platform-github"
import * as Effect from "effect/Effect"

/**
 * The main action logic using Effect
 *
 * Demonstrates the full Effect-based GitHub Action toolkit:
 * - Reading inputs via Input module (Schema-first parsing)
 * - Accessing workflow context via ActionContext
 * - Making API calls via ActionClient (Octokit)
 * - High-level PR operations via PR module
 * - Structured logging with groups
 * - Setting outputs
 */
const program = Effect.gen(function*() {
  // Parse inputs using the new Input module
  // github-token is handled internally by Action.runMain via GITHUB_TOKEN env var
  // Here we demonstrate optional inputs with defaults
  const verbose = yield* Input.boolean("verbose").pipe(
    Effect.orElseSucceed(() => false)
  )

  // Get workflow context
  const eventName = yield* ActionContext.eventName
  const actor = yield* ActionContext.actor
  const sha = yield* ActionContext.sha
  const ref = yield* ActionContext.ref
  const workflow = yield* ActionContext.workflow
  const runId = yield* ActionContext.runId
  const runNumber = yield* ActionContext.runNumber
  const serverUrl = yield* ActionContext.serverUrl
  const repo = yield* ActionContext.repo

  yield* ActionRunner.group("Workflow Context", () =>
    Effect.gen(function*() {
      yield* ActionRunner.info(`Event: ${eventName}`)
      yield* ActionRunner.info(`Repository: ${repo.owner}/${repo.repo}`)
      yield* ActionRunner.info(`Actor: ${actor}`)
      yield* ActionRunner.info(`SHA: ${sha.substring(0, 7)}`)
      yield* ActionRunner.info(`Ref: ${ref}`)
      yield* ActionRunner.info(`Workflow: ${workflow}`)
      yield* ActionRunner.info(`Run ID: ${runId}`)
      yield* ActionRunner.info(`Run Number: ${runNumber}`)
      if (verbose) {
        yield* ActionRunner.debug(`Server URL: ${serverUrl}`)
        yield* ActionRunner.debug(`Full SHA: ${sha}`)
      }
    })
  )

  // Try to use the high-level PR module - it auto-fails if not a PR context
  // This demonstrates the "pit of success" pattern
  const prResult = yield* Effect.either(
    Effect.gen(function*() {
      // These accessors are provided by Effect.Service with accessors: true
      const prNumber = yield* PR.number
      const headRef = yield* PR.headRef
      const baseRef = yield* PR.baseRef
      const draft = yield* PR.draft
      const files = yield* PR.files

      return { prNumber, headRef, baseRef, draft, files }
    }).pipe(Effect.provide(PR.Default))
  )

  if (prResult._tag === "Right") {
    const { prNumber, headRef, baseRef, draft, files } = prResult.right

    yield* ActionRunner.group("Creating PR Comment", () =>
      Effect.gen(function*() {
        yield* ActionRunner.info(`PR #${prNumber} detected via PR module`)

        // Summarize files changed
        const filesSummary = files.length > 5
          ? `${files.slice(0, 5).map((f) => `\`${f.filename}\``).join(", ")} and ${files.length - 5} more`
          : files.map((f) => `\`${f.filename}\``).join(", ") || "No files"

        const commentBody = [
          "## Effect GitHub Action Demo",
          "",
          "This comment was created using **@effect-native/platform-github** running on Node.js with native TypeScript support.",
          "",
          "### Workflow Context",
          "",
          "| Property | Value |",
          "|----------|-------|",
          `| Event | \`${eventName}\` |`,
          `| Actor | @${actor} |`,
          `| SHA | \`${sha.substring(0, 7)}\` |`,
          `| Ref | \`${ref}\` |`,
          `| Workflow | ${workflow} |`,
          `| Run | [#${runNumber}](${serverUrl}/${repo.owner}/${repo.repo}/actions/runs/${runId}) |`,
          "",
          "### PR Details (via PR module)",
          "",
          "| Property | Value |",
          "|----------|-------|",
          `| Branch | \`${headRef}\` → \`${baseRef}\` |`,
          `| Draft | ${draft ? "Yes" : "No"} |`,
          `| Files Changed | ${files.length} |`,
          `| Files | ${filesSummary} |`,
          "",
          "### Technical Details",
          "",
          "- **Runtime**: Node.js 24 with native TypeScript support",
          "- **Package**: `@effect-native/platform-github`",
          "- **Services Used**:",
          "  - `Input` - Schema-first input parsing",
          "  - `ActionRunner` - Logging, outputs",
          "  - `ActionContext` - Workflow metadata",
          "  - `ActionClient` - Octokit API client",
          "  - `PR` - High-level PR operations",
          "",
          "---",
          `*Timestamp: ${new Date().toISOString()}*`
        ].join("\n")

        // Create the comment using ActionClient
        yield* ActionClient.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
          owner: repo.owner,
          repo: repo.repo,
          issue_number: prNumber,
          body: commentBody
        })

        yield* ActionRunner.info(`Comment created on PR #${prNumber}`)
      })
    )
  } else {
    yield* ActionRunner.info("Not a PR event, skipping comment creation")
  }

  // Set outputs
  yield* ActionRunner.setOutput("repo", `${repo.owner}/${repo.repo}`)
  yield* ActionRunner.setOutput("sha", sha)
  yield* ActionRunner.setOutput("actor", actor)
  yield* ActionRunner.setOutput("event", eventName)

  yield* ActionRunner.notice(`Effect GitHub Action completed successfully!`, {
    title: "Action Complete"
  })

  return { repo, sha, actor }
})

// Run the action - errors are handled automatically by runMain
// InputValidationFailure and ActionFailed are formatted nicely for GitHub UI
Action.runMain(program)
