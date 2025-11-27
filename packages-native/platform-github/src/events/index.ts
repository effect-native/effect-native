/**
 * Event-specific context services for GitHub Actions.
 *
 * These modules provide typed access to webhook payloads for specific event types.
 * Each module validates the event type at layer construction, failing fast if
 * the event doesn't match.
 *
 * @example
 * ```typescript
 * import { Action } from "@effect-native/platform-github"
 * import { IssueComment } from "@effect-native/platform-github/events"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const ctx = yield* IssueComment.IssueCommentContext
 *   yield* ctx.addReaction("eyes")
 * })
 *
 * Action.runMain(program.pipe(Effect.provide(IssueComment.layer)))
 * ```
 *
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */
export * as IssueComment from "./IssueComment.js"
