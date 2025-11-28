/**
 * GitHub Action Demo - @effect-native/platform-github
 *
 * Showcases the slickest DX for building GitHub Actions with Effect:
 * - Console.log routes to GitHub Actions UI automatically
 * - High-level Comment/Issue/PR services with static accessors
 * - Type-safe inputs with Schema validation
 * - Clean error handling with pit-of-success patterns
 */
import { Action, ActionRunner, Comment, GithubToken, Input, Issue, PR } from "@effect-native/platform-github"
import { Console, Effect, Layer } from "effect"

const program = Effect.gen(function*() {
  // ─────────────────────────────────────────────────────────────────────────────
  // Console.log just works - routes to GitHub Actions UI via ConsoleGitHubActions
  // ─────────────────────────────────────────────────────────────────────────────
  yield* Console.log("Starting Effect GitHub Action demo...")

  // ─────────────────────────────────────────────────────────────────────────────
  // Type-safe inputs with Schema validation
  // ─────────────────────────────────────────────────────────────────────────────
  const verbose = yield* Input.boolean("verbose").pipe(Effect.orElseSucceed(() => false))

  // ─────────────────────────────────────────────────────────────────────────────
  // High-level Issue service - clean accessor syntax
  // ─────────────────────────────────────────────────────────────────────────────
  const issueNumber = yield* Issue.number
  const issueTitle = yield* Issue.title
  const isPR = yield* Issue.isPullRequest
  const labels = yield* Issue.labels

  yield* Console.log(`Issue #${issueNumber}: ${issueTitle}`)
  yield* Console.log(`Labels: ${labels.length > 0 ? labels.join(", ") : "(none)"}`)

  // ─────────────────────────────────────────────────────────────────────────────
  // PR service - auto-fails if not a PR (pit of success!)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isPR) {
    const headRef = yield* PR.headRef
    const baseRef = yield* PR.baseRef
    const files = yield* PR.files
    const draft = yield* PR.draft

    yield* Console.log(`PR: ${headRef} → ${baseRef} (${files.length} files${draft ? ", draft" : ""})`)

    if (verbose) {
      for (const file of files.slice(0, 5)) {
        yield* Console.log(`  ${file.status}: ${file.filename}`)
      }
      if (files.length > 5) {
        yield* Console.log(`  ... and ${files.length - 5} more`)
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Comment service - react and reply to the triggering comment
  // ─────────────────────────────────────────────────────────────────────────────
  const commentBody = yield* Comment.body
  const commentAuthor = yield* Comment.author

  yield* Console.log(`Comment by @${commentAuthor}: "${commentBody.slice(0, 50)}${commentBody.length > 50 ? "..." : ""}"`)

  // React with eyes to acknowledge we saw it
  yield* Comment.react("eyes")

  // Build a nice reply
  const replyBody = [
    "## Effect GitHub Action Demo",
    "",
    `Thanks for the comment, @${commentAuthor}!`,
    "",
    "This reply was created using **@effect-native/platform-github**.",
    "",
    "### What's happening here?",
    "",
    "```typescript",
    'import { Action, Comment, Issue, PR } from "@effect-native/platform-github"',
    'import { Console, Effect } from "effect"',
    "",
    "const program = Effect.gen(function*() {",
    "  yield* Console.log('Just works!')  // Routes to GitHub UI",
    "  yield* Comment.react('eyes')       // React to comment",
    "  yield* Comment.reply('Hello!')     // Reply to issue/PR",
    "})",
    "",
    "Action.runMain(program)",
    "```",
    "",
    "### Services Used",
    "",
    `| Service | Usage |`,
    `|---------|-------|`,
    `| \`Console\` | Logs to GitHub Actions UI |`,
    `| \`Comment\` | Read/react/reply to comments |`,
    `| \`Issue\` | Access issue #${issueNumber} |`,
    isPR ? `| \`PR\` | Access PR details |` : "",
    "",
    "---",
    `*${new Date().toISOString()}*`
  ].filter(Boolean).join("\n")

  yield* Comment.reply(replyBody)
  yield* Console.log("Reply posted!")

  // ─────────────────────────────────────────────────────────────────────────────
  // Set outputs and finish
  // ─────────────────────────────────────────────────────────────────────────────
  yield* ActionRunner.setOutput("issue-number", String(issueNumber))
  yield* ActionRunner.setOutput("is-pr", String(isPR))
  yield* ActionRunner.notice("Effect GitHub Action completed!", { title: "Success" })
})

// Build the full layer:
// 1. GithubToken.layer provides the token from env
// 2. Action.Default uses GithubToken to provide ActionRequirements (incl. ActionRunner)
// 3. Comment/Issue/PR.Default use ActionContext and ActionClient
// Use provideMerge to keep Action.Default's outputs available
const FullLayer = Layer.mergeAll(
  Comment.Default,
  Issue.Default,
  PR.Default
).pipe(
  Layer.provideMerge(Action.Default),
  Layer.provide(GithubToken.layer)
)

// Run the program with all dependencies satisfied
Effect.runPromise(Effect.provide(program, FullLayer)).catch((e) => {
  console.error(e)
  process.exit(1)
})
