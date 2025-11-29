# Theoretical Framework: PR Helpers Module

## Module Structure

```
src/
  events/
    IssueComment.ts       # IssueCommentContext service
    PullRequest.ts        # PullRequestContext service
    index.ts              # Re-exports
  PR.ts                   # Shared PR operations
  index.ts                # Updated with new exports
```

## API Design

### 1. IssueComment Module (`src/events/IssueComment.ts`)

```typescript
import type { IssueCommentEvent } from "@octokit/webhooks-types"
import type { Tag } from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { ActionApiError, ActionContextError } from "../ActionError.js"
import * as ActionClient from "../ActionClient.js"
import * as ActionContext from "../ActionContext.js"

// TypeId for brand
export const TypeId: unique symbol = Symbol.for("@effect-native/platform-github/IssueCommentContext")
export type TypeId = typeof TypeId

// Reaction types
export type Reaction = "+1" | "-1" | "laugh" | "confused" | "heart" | "hooray" | "rocket" | "eyes"

// Context interface
export interface IssueCommentContext {
  readonly [TypeId]: TypeId
  readonly payload: IssueCommentEvent
  readonly owner: string
  readonly repo: string
  readonly issueNumber: number
  readonly commentId: number
  readonly commentBody: string
  readonly commentAuthor: string
  readonly isPullRequest: boolean
  
  // Bound operations (convenience)
  readonly addReaction: (reaction: Reaction) => Effect.Effect<void, ActionApiError>
  readonly reply: (body: string) => Effect.Effect<void, ActionApiError>
}

// Service tag
export const IssueCommentContext: Tag<IssueCommentContext, IssueCommentContext>

// Layer - validates event type at construction
export const layer: Layer.Layer<IssueCommentContext, ActionContextError, ActionContext.ActionContext | ActionClient.ActionClient>

// Accessors
export const payload: Effect.Effect<IssueCommentEvent, never, IssueCommentContext>
export const owner: Effect.Effect<string, never, IssueCommentContext>
export const repo: Effect.Effect<string, never, IssueCommentContext>
// ... etc
```

### 2. PR Module (`src/PR.ts`)

Parameterized operations that work independent of context:

```typescript
import type { PullRequestFile } from "@octokit/webhooks-types"
import * as Effect from "effect/Effect"
import type { ActionApiError } from "./ActionError.js"
import * as ActionClient from "./ActionClient.js"

// Types
export type Reaction = "+1" | "-1" | "laugh" | "confused" | "heart" | "hooray" | "rocket" | "eyes"

export interface RepoRef {
  readonly owner: string
  readonly repo: string
}

export interface IssueRef extends RepoRef {
  readonly issueNumber: number
}

export interface PullRequestRef extends RepoRef {
  readonly pullNumber: number
}

// Comment operations
export const createComment: (
  ref: IssueRef,
  body: string
) => Effect.Effect<unknown, ActionApiError, ActionClient.ActionClient>

export const updateComment: (
  ref: RepoRef & { commentId: number },
  body: string
) => Effect.Effect<unknown, ActionApiError, ActionClient.ActionClient>

// Reaction operations  
export const addReactionToComment: (
  ref: RepoRef & { commentId: number },
  reaction: Reaction
) => Effect.Effect<unknown, ActionApiError, ActionClient.ActionClient>

export const addReactionToIssue: (
  ref: IssueRef,
  reaction: Reaction
) => Effect.Effect<unknown, ActionApiError, ActionClient.ActionClient>

// Diff operations
export const getDiff: (
  ref: PullRequestRef,
  options?: { maxLength?: number }
) => Effect.Effect<string, ActionApiError, ActionClient.ActionClient>

export const getFiles: (
  ref: PullRequestRef
) => Effect.Effect<Array<PullRequestFile>, ActionApiError, ActionClient.ActionClient>

// PR info operations
export const getPullRequest: (
  ref: PullRequestRef
) => Effect.Effect<PullRequest, ActionApiError, ActionClient.ActionClient>
```

### 3. Usage Examples

**Issue Comment Workflow:**
```typescript
import { Action, IssueCommentContext } from "@effect-native/platform-github"
import { Console, Effect } from "effect"

const program = Effect.gen(function* () {
  const ctx = yield* IssueCommentContext.IssueCommentContext
  
  // Skip if not a PR comment
  if (!ctx.isPullRequest) {
    yield* Console.info("Not a PR comment, skipping")
    return
  }
  
  // React to acknowledge
  yield* ctx.addReaction("eyes")
  
  // Process and reply
  yield* ctx.reply("Thanks for your comment!")
})

Action.runMain(
  program.pipe(Effect.provide(IssueCommentContext.layer))
)
```

**Using Parameterized Operations:**
```typescript
import { Action, PR } from "@effect-native/platform-github"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  // Post to a specific PR (not necessarily the trigger)
  yield* PR.createComment(
    { owner: "my-org", repo: "my-repo", issueNumber: 42 },
    "Automated comment"
  )
  
  // Get diff from another PR
  const diff = yield* PR.getDiff(
    { owner: "my-org", repo: "my-repo", pullNumber: 100 }
  )
})

Action.runMain(program)
```

## Implementation Phases

### Phase 1: IssueCommentContext (MVP)
- [ ] Create `src/events/IssueComment.ts`
- [ ] Create `src/events/IssueCommentTest.ts`
- [ ] Add tests
- [ ] Export from `src/index.ts`

### Phase 2: PR Operations Module
- [ ] Create `src/PR.ts` with parameterized operations
- [ ] Add tests
- [ ] Export from `src/index.ts`

### Phase 3: PullRequestContext (Future)
- [ ] Create `src/events/PullRequest.ts`
- [ ] Create `src/events/PullRequestTest.ts`
- [ ] Add tests

### Phase 4: Additional Events (Future)
- [ ] PullRequestReviewContext
- [ ] PullRequestReviewCommentContext
