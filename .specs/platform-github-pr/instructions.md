# Platform GitHub: PR Helpers Module

## Overview

Add PR helpers to `@effect-native/platform-github` for type-safe, testable GitHub Action development.

## Deliverables

### Phase 1: IssueCommentContext (Priority)

Create `src/events/IssueComment.ts`:
- `IssueCommentContext` service with typed payload access
- Convenience methods: `addReaction()`, `reply()`
- Validates event type at layer construction
- Exports `IssueCommentContextTest` for mocking

### Phase 2: PR Operations Module

Create `src/PR.ts`:
- Parameterized operations that work with any PR
- `createComment(ref, body)`
- `addReactionToComment(ref, reaction)`
- `getDiff(ref, options?)`
- `getFiles(ref)`

## Implementation Details

### IssueCommentContext Interface

```typescript
interface IssueCommentContext {
  readonly [TypeId]: TypeId
  readonly payload: IssueCommentEvent
  readonly owner: string
  readonly repo: string
  readonly issueNumber: number
  readonly commentId: number
  readonly commentBody: string
  readonly commentAuthor: string
  readonly isPullRequest: boolean
  
  // Bound to trigger comment
  readonly addReaction: (reaction: Reaction) => Effect<void, ActionApiError>
  readonly reply: (body: string) => Effect<void, ActionApiError>
}
```

### PR Operations

```typescript
// Reference types
interface RepoRef { owner: string; repo: string }
interface IssueRef extends RepoRef { issueNumber: number }
interface PullRequestRef extends RepoRef { pullNumber: number }

// Operations
createComment(ref: IssueRef, body: string): Effect<unknown, ActionApiError, ActionClient>
addReactionToComment(ref: RepoRef & { commentId: number }, reaction: Reaction): Effect<...>
getDiff(ref: PullRequestRef, options?: { maxLength?: number }): Effect<string, ...>
getFiles(ref: PullRequestRef): Effect<Array<PullRequestFile>, ...>
```

## File Structure

```
src/
  events/
    IssueComment.ts           # IssueCommentContext service
    IssueCommentTest.ts       # Test utilities
    internal/
      issueComment.ts         # Internal implementation
  PR.ts                       # Parameterized PR operations
  internal/
    pr.ts                     # Internal implementation
```

## Testing Requirements

1. Unit tests for IssueCommentContext layer construction
2. Unit tests for each PR operation
3. Integration test showing workflow pattern
4. Mock layer tests demonstrating testability

## Success Criteria

- [ ] `IssueCommentContext.layer` validates event type
- [ ] Type-safe payload access without casts
- [ ] Parameterized operations work with ActionClient
- [ ] Test utilities enable mocking
- [ ] All existing exports preserved (additive)
- [ ] Documentation with examples

## References

- PREP artifacts in `./PREP/`
- Prototype: `worktrees/openrouter-monorepo--sdk-effects/packages/action-demo/src/PR/`
- Workflow: `worktrees/openrouter-monorepo--sdk-effects/.github/workflows/or-ai-comment.yaml`
