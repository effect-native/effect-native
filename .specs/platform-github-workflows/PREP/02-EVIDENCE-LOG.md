# PREP Phase 2: Evidence Log

## Evidence: GitHub Actions Architecture

### [SUPPORTS Hypothesis] Workflows are Declarative

From GitHub docs and existing workflows:

```yaml
# This is DECLARATIVE - defines WHAT happens WHEN
on:
  pull_request:
    branches: [main]

jobs:
  types:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
```

You can't express `on:`, `jobs:`, `runs-on:`, or `uses:` in TypeScript.

### [SUPPORTS] setup/action.yml needs to run BEFORE Node

```yaml
steps:
  - name: Detect pnpm
    shell: bash
    run: |
      if command -v pnpm >/dev/null 2>&1; then
        ...
  - name: Install node
    uses: actions/setup-node@v4
```

The setup action runs BEFORE Node.js is available. A TypeScript action would need Node already installed - chicken and egg problem.

### [SUPPORTS] Workflows use existing actions

```yaml
- uses: changesets/action@e0145edc7d9d8679003495b11f87bd8ef63c0cba
- uses: anthropics/claude-code-action@beta
- uses: pnpm/action-setup@v3
```

These are community actions. No value in rewriting them in TS.

### [FALSIFIES] Some workflows COULD use TS for steps

```yaml
# check.yml
- run: pnpm check
- run: pnpm test-types --target '>=5.4'
```

These could theoretically be a TS script, but:
- They're one-liners
- Adding TS complexity wouldn't help
- The value is near zero

### [SUPPORTS] test-github-action-scratchpad.yml already dogfoods

```yaml
- name: Run Effect GitHub Action
  uses: ./packages-native/github-action-scratchpad
```

We're already dogfooding! This is the right place for TS.

## Evidence: What TypeScript Actions Excel At

### [SUPPORTS] Comment-triggered automation

The `/or-ai` pattern from `action-demo` shows where TS shines:

```typescript
// This is COMPLEX LOGIC that benefits from TypeScript
const program = Effect.gen(function* () {
  const body = yield* Comment.body
  if (!body.startsWith("/or-ai")) return
  
  const diff = yield* PR.diff
  const response = yield* generateAiResponse(body, diff)
  yield* Comment.reply(response)
})
```

This would be horrible in YAML/shell.

### [SUPPORTS] API interactions

```typescript
yield* Comment.react("eyes")
yield* PR.files
yield* Issue.addLabel("needs-review")
```

Type-safe, composable, testable. YAML can't do this.

## Evidence: What Would NOT Benefit

### [FALSIFIES] Simple shell commands

```yaml
- run: pnpm check
- run: git diff --exit-code
```

Converting these to TS would add complexity for zero benefit.

### [FALSIFIES] Using existing GitHub Actions

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
```

These are battle-tested. Reimplementing them would be foolish.

## Summary of Evidence

| Category | TS Value | Keep YAML? |
|----------|----------|------------|
| Workflow triggers | None | ✅ Yes |
| Job orchestration | None | ✅ Yes |
| Simple shell steps | Low | ✅ Yes |
| Existing actions | None | ✅ Yes |
| Comment-triggered logic | **High** | ❌ Use TS |
| API interactions | **High** | ❌ Use TS |
| Complex conditionals | Medium | Case-by-case |
