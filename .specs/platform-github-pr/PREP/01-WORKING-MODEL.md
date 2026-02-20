# Working Model: PR Helpers Module

## Revised Architecture

Based on the evidence, the PR helpers should be structured as:

### 1. Event-Specific Context Services

Instead of a single `PR` service, create event-specific context services:

```typescript
// IssueComment.ts - for issue_comment events
export interface IssueCommentContext {
  readonly payload: IssueCommentEvent
  readonly owner: string
  readonly repo: string
  readonly issueNumber: number
  readonly commentId: number
  readonly commentBody: string
  readonly commentAuthor: string
  readonly isPullRequest: boolean
}

// PullRequest.ts - for pull_request events
export interface PullRequestContext {
  readonly payload: PullRequestEvent
  readonly owner: string
  readonly repo: string
  readonly number: number
  readonly action: PullRequestEvent["action"]
  readonly title: string
  readonly body: string
  readonly author: string
}
```

### 2. Shared PR Operations Module

Operations that work with any PR context (once you have owner/repo/number):

```typescript
// PR.ts - shared operations
export const addReaction = (
  commentId: number,
  reaction: Reaction
) => Effect<void, ActionApiError, ActionClient>

export const createComment = (
  issueNumber: number,
  body: string
) => Effect<Comment, ActionApiError, ActionClient>

export const getDiff = (
  pullNumber: number
) => Effect<string, ActionApiError, ActionClient>

export const getFiles = (
  pullNumber: number
) => Effect<Array<PullRequestFile>, ActionApiError, ActionClient>
```

### 3. Convenience Layers

High-level layers that combine context + operations:

```typescript
// For issue_comment triggered workflows
export const IssueCommentWorkflow = Layer.effect(
  IssueCommentContext,
  Effect.gen(function*() {
    const payload = yield* ActionContext.typedPayload("issue_comment")
    return {/* context properties */}
  })
)

// For pull_request triggered workflows
export const PullRequestWorkflow = Layer.effect(
  PullRequestContext,
  Effect.gen(function*() {
    const payload = yield* ActionContext.typedPayload("pull_request")
    return {/* context properties */}
  })
)
```

## File Structure

```
src/
  events/
    IssueComment.ts       # IssueCommentContext service
    PullRequest.ts        # PullRequestContext service
    PullRequestReview.ts  # Future: PR review events
  PR.ts                   # Shared PR operations (addReaction, createComment, getDiff, etc.)
```

## Key Design Decisions

1. **Event-specific over generic**: Different events have different shapes; embrace it
2. **Composition over inheritance**: Shared operations in PR.ts, context in events/*
3. **Type safety first**: Use `typedPayload()` to validate event type
4. **Fail fast**: Layer construction fails if event type doesn't match
5. **Testable**: Each service has a corresponding *Test module for mocking
