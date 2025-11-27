/**
 * Type-safe webhook payload access for GitHub Actions.
 *
 * This module provides type-safe access to GitHub webhook payloads using
 * types from `@octokit/webhooks-types`. It eliminates the need for unsafe
 * type assertions when accessing event-specific payload data.
 *
 * @example
 * ```ts
 * import { EventPayload } from "@effect-native/platform-github"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   // Type-safe payload access with event name validation
 *   const payload = yield* EventPayload.get("issue_comment")
 *   // payload is fully typed as IssueCommentEvent
 *   console.log(payload.comment.body)
 *   console.log(payload.issue.number)
 * })
 * ```
 *
 * @since 1.0.0
 */
import type {
  CheckRunEvent,
  CheckSuiteEvent,
  CreateEvent,
  DeleteEvent,
  DeploymentEvent,
  DeploymentStatusEvent,
  ForkEvent,
  IssueCommentEvent,
  IssuesEvent,
  LabelEvent,
  MilestoneEvent,
  PageBuildEvent,
  PullRequestEvent,
  PullRequestReviewCommentEvent,
  PullRequestReviewEvent,
  PushEvent,
  ReleaseEvent,
  StatusEvent,
  WatchEvent,
  WorkflowDispatchEvent,
  WorkflowJobEvent,
  WorkflowRunEvent
} from "@octokit/webhooks-types"
import * as Effect from "effect/Effect"
import * as ActionContext from "./ActionContext.js"
import { ActionContextError } from "./ActionError.js"

// =============================================================================
// Event Name to Payload Type Map
// =============================================================================

/**
 * Maps GitHub event names to their corresponding payload types.
 *
 * This interface provides a type-level mapping that enables compile-time
 * type safety when accessing webhook payloads.
 *
 * @since 1.0.0
 * @category models
 */
export interface EventPayloadMap {
  readonly check_run: CheckRunEvent
  readonly check_suite: CheckSuiteEvent
  readonly create: CreateEvent
  readonly delete: DeleteEvent
  readonly deployment: DeploymentEvent
  readonly deployment_status: DeploymentStatusEvent
  readonly fork: ForkEvent
  readonly issue_comment: IssueCommentEvent
  readonly issues: IssuesEvent
  readonly label: LabelEvent
  readonly milestone: MilestoneEvent
  readonly page_build: PageBuildEvent
  readonly pull_request: PullRequestEvent
  readonly pull_request_review: PullRequestReviewEvent
  readonly pull_request_review_comment: PullRequestReviewCommentEvent
  readonly push: PushEvent
  readonly release: ReleaseEvent
  readonly status: StatusEvent
  readonly watch: WatchEvent
  readonly workflow_dispatch: WorkflowDispatchEvent
  readonly workflow_job: WorkflowJobEvent
  readonly workflow_run: WorkflowRunEvent
}

/**
 * All supported event names.
 *
 * @since 1.0.0
 * @category models
 */
export type EventName = keyof EventPayloadMap

// =============================================================================
// Type-Safe Payload Access
// =============================================================================

/**
 * Get the payload with type narrowing based on event name.
 *
 * This function validates that the current event matches the expected event name
 * and returns a fully typed payload. If the event names don't match, it fails
 * with an `ActionContextError`.
 *
 * @example
 * ```ts
 * import { EventPayload } from "@effect-native/platform-github"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const payload = yield* EventPayload.get("issue_comment")
 *   // payload is fully typed as IssueCommentEvent
 *   console.log(payload.comment.body)
 *   console.log(payload.issue.number)
 *   console.log(payload.repository.full_name)
 * })
 * ```
 *
 * @since 1.0.0
 * @category accessors
 */
export const get = <E extends EventName>(
  expectedEvent: E
): Effect.Effect<EventPayloadMap[E], ActionContextError, ActionContext.ActionContext> =>
  Effect.flatMap(ActionContext.ActionContext, (ctx) => {
    if (ctx.eventName !== expectedEvent) {
      return Effect.fail(
        new ActionContextError({
          reason: "EventMismatch",
          description: `Expected event '${expectedEvent}' but got '${ctx.eventName}'`
        })
      )
    }
    return Effect.succeed(ctx.payload as EventPayloadMap[E])
  })

/**
 * Get payload without event name validation.
 *
 * Use this when you're confident about the event type or when the event name
 * check has already been performed elsewhere. This provides type-safety without
 * runtime validation.
 *
 * @example
 * ```ts
 * import { EventPayload, ActionContext } from "@effect-native/platform-github"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const eventName = yield* ActionContext.eventName
 *   if (eventName === "issue_comment") {
 *     const payload = yield* EventPayload.unsafeGet("issue_comment")
 *     // Handle issue_comment event
 *   }
 * })
 * ```
 *
 * @since 1.0.0
 * @category accessors
 */
export const unsafeGet = <E extends EventName>(
  _event: E
): Effect.Effect<EventPayloadMap[E], never, ActionContext.ActionContext> =>
  Effect.map(ActionContext.ActionContext, (ctx) => ctx.payload as EventPayloadMap[E])

/**
 * Get the raw payload without type narrowing.
 *
 * This is equivalent to `ActionContext.payload` but provided here for
 * consistency with the EventPayload API.
 *
 * @since 1.0.0
 * @category accessors
 */
export const raw: Effect.Effect<
  Record<string, unknown>,
  never,
  ActionContext.ActionContext
> = ActionContext.payload

// =============================================================================
// Re-exports for convenience
// =============================================================================

/**
 * Re-export commonly used webhook event types for convenience.
 *
 * @since 1.0.0
 * @category types
 */
export type {
  CheckRunEvent,
  CheckSuiteEvent,
  CreateEvent,
  DeleteEvent,
  DeploymentEvent,
  DeploymentStatusEvent,
  ForkEvent,
  IssueCommentEvent,
  IssuesEvent,
  LabelEvent,
  MilestoneEvent,
  PageBuildEvent,
  PullRequestEvent,
  PullRequestReviewCommentEvent,
  PullRequestReviewEvent,
  PushEvent,
  ReleaseEvent,
  StatusEvent,
  WatchEvent,
  WorkflowDispatchEvent,
  WorkflowJobEvent,
  WorkflowRunEvent
} from "@octokit/webhooks-types"
