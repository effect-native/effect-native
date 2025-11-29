# Hypothesis: PR Helpers Module Design

## Initial Assumptions

### 1. Service Pattern
I expect the PR helpers to follow the Effect service pattern, similar to how `ActionClient`, `ActionContext`, and `ActionRunner` are structured:
- A Context Tag for the service
- A Layer that constructs the service
- Accessor functions that extract methods

### 2. Event-Specific Layers
I expect we'll need event-specific layers for different GitHub events:
- `IssueCommentEvent` for PR comment workflows
- `PullRequestEvent` for PR open/sync workflows
- Each provides a typed context with relevant helpers

### 3. Core Operations
Based on the prototype PR service, I expect the core operations to be:
- `addReaction(reaction)` - React to comments
- `replyToComment(body)` - Post comment replies
- `getDiff()` - Get PR diff content
- `getFiles()` - Get changed files list
- Context properties: owner, repo, number, commentId, etc.

### 4. Layer Dependencies
I expect the PR service to depend on:
- `ActionContext` - For raw payload access
- `ActionClient` - For GitHub API calls
The service layer should compose with the existing Action.layer.

### 5. Type Safety
I expect we'll use `@octokit/webhooks-types` (already added) to:
- Validate event type at runtime
- Provide fully-typed payload access
- Fail fast if event type doesn't match

## Why These Assumptions

1. **Service Pattern**: Proven pattern in Effect ecosystem, enables testability via mock layers
2. **Event-Specific**: Different events have different payloads; type safety matters
3. **Core Operations**: These are the operations used in the prototype; they cover common use cases
4. **Dependencies**: Follows existing architecture; ActionClient handles auth/API
5. **Type Safety**: Already invested in @octokit/webhooks-types; should leverage it
