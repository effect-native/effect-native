# Constants: Immutable Facts and Constraints

## Technical Constraints

### 1. GitHub API Constraints

- **Rate limits**: 5000 requests/hour for authenticated requests
- **Diff size**: GitHub truncates diffs > 3MB
- **Comment length**: Max 65536 characters per comment
- **Reaction types**: Limited to: `+1`, `-1`, `laugh`, `confused`, `heart`, `hooray`, `rocket`, `eyes`

### 2. Webhook Payload Structure

- Event type is in `ctx.eventName` (from GITHUB_EVENT_NAME)
- Payload is in `ctx.payload` (from GITHUB_EVENT_PATH file)
- `issue_comment` payload has `issue.pull_request` to distinguish PR from issue comments
- `pull_request` payload has direct PR data

### 3. Effect Ecosystem Constraints

- Must follow Effect service pattern (Tag + Layer)
- Must be testable via mock layers
- Must compose with existing Action.layer
- Should avoid circular dependencies (use internal/* pattern)

### 4. Package Constraints

- Package is `@effect-native/platform-github`
- Exports must be additive (don't break existing exports)
- Types come from `@octokit/webhooks-types`

## Invariants

### 1. Event Type Validation

- MUST validate event type before casting payload
- MUST fail with clear error if event type doesn't match
- Error MUST include expected and actual event names

### 2. API Safety

- MUST handle API errors gracefully (ActionApiError)
- MUST respect diff truncation to avoid memory issues
- MUST mark secrets properly (don't log tokens)

### 3. Naming Conventions

- Services: `<Event>Context` (e.g., `IssueCommentContext`)
- Layers: `<Event>Context.layer` or `<Event>ContextLive`
- Test layers: `<Event>ContextTest`
- Operations: verb-noun (e.g., `addReaction`, `createComment`)

### 4. Dependency Direction

```
Action.layer
    │
    ├── ActionRunner.layer
    ├── ActionContext.layer
    ├── ActionClient.layer
    └── ActionSummary.layer

Event layers (optional, provided by user)
    │
    └── IssueCommentContext.layer  ──requires──> ActionContext
                                   ──requires──> ActionClient

PR operations (stateless functions)
    │
    └── addReaction, createComment, etc. ──requires──> ActionClient
```
