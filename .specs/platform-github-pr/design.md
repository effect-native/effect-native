# Design: High-Level GitHub Actions DX

## Architecture Overview

Three services using `Effect.Service` with `accessors: true`:

- **Comment** - Operations on the triggering comment (requires `issue_comment` event)
- **Issue** - Operations on the parent issue (requires `issue_comment` or `issues` event)
- **PR** - Pull request operations (auto-fails if not a PR context)

Each service:

- Validates event type at construction time
- Provides static accessors via `accessors: true`
- Includes a `Test` factory for mock layers

## Module Structure

```
src/
  Comment.ts      # Effect.Service for comment operations
  Issue.ts        # Effect.Service for issue operations  
  PR.ts           # Effect.Service for PR operations
  index.ts        # Re-exports all modules
```

## Service Dependencies

```
Comment ──┬── ActionContext (for payload)
          └── ActionClient (for API calls)

Issue ────┬── ActionContext
          └── ActionClient

PR ───────┬── ActionContext
          └── ActionClient
```

Note: Each service has its own dependencies. They do NOT depend on each other.
This allows using `Issue.isPullRequest` without requiring PR service.

## Data Flow

1. GitHub webhook triggers workflow
2. `ActionContext.layer` parses `GITHUB_EVENT_PATH` into raw payload
3. Each service's `effect:` function:
   - Reads from ActionContext
   - Validates event type
   - Extracts typed fields from payload
   - Returns service implementation with bound context

## Error Handling Strategy

### Event Validation Errors

- Wrong event type → `ActionContextError` with reason `EventMismatch`
- Thrown at service construction (layer building) time

### PR Context Errors

- PR operations on non-PR → `NotPullRequestError`
- Custom error class extending `Data.TaggedError`
- Catchable via `Effect.catchTag("NotPullRequestError", ...)`

### API Errors

- GitHub API failures → `ActionApiError`
- Contains: method, status, description, cause
- Has `isRateLimited` getter for retry decisions

## Test Layer Design

Each service has a static `Test` factory:

```
Comment.Test(options) → Layer<Comment>
Issue.Test(options) → Layer<Issue>
PR.Test(options) → Layer<PR>
```

Test layers:

- Return `Effect.succeed(value)` for accessors
- Return `Effect.void` for operations (no-op)
- Allow overriding specific values via options

## Accessor Pattern

Services return an object where each property is either:

- An Effect (for no-arg accessors): `id: Effect.succeed(commentId)`
- A function returning Effect (for operations): `react: (r) => client.request(...)`

`Effect.Service` with `accessors: true` generates static accessors:

- `Comment.id` becomes `Effect.flatMap(Comment, (c) => c.id)`
- `Comment.react("eyes")` becomes `Effect.flatMap(Comment, (c) => c.react("eyes"))`

## Payload Type Handling

Use `@octokit/webhooks-types` for payload types:

- `IssueCommentEvent` for issue_comment events
- `IssuesEvent` for issues events
- `PullRequestEvent` for pull_request events

Cast payload with `as unknown as EventType` inside service implementation.
Users never see these casts - they get typed accessors.

## Test Strategy

### Unit Tests (Required)

1. Service construction with valid event type
2. Service construction fails with wrong event type
3. Each accessor returns expected value
4. Each operation calls correct API endpoint
5. Test layer works for mocking

### Integration Tests (Required)

1. Comment.Test layer allows testing user code
2. Issue.Test layer allows testing user code
3. PR.Test layer allows testing user code
4. Layers compose correctly with provided dependencies

### E2E Tests (Nice to Have)

1. Scratchpad action uses new modules
2. CI workflow validates real API calls work

## API Surface

### Comment Module Exports

- `class Comment` - Service class with static accessors
- `type Reaction` - Union of valid reaction types
- `type CommentAction` - "created" | "edited" | "deleted"

### Issue Module Exports

- `class Issue` - Service class with static accessors

### PR Module Exports

- `class PR` - Service class with static accessors
- `class NotPullRequestError` - Error for non-PR context
- `interface PRFile` - Changed file info
- `interface PRCommit` - Commit info
