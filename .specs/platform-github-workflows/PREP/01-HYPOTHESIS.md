# PREP Phase 1: Hypothesis - Dogfooding Platform-GitHub in Workflows

## The Question

Can we replace YAML workflows with TypeScript powered by `@effect-native/platform-github`?

## Initial Hypothesis

**I expect:** Most workflow logic CANNOT be replaced with TypeScript because GitHub Actions YAML is a declarative DSL for workflow orchestration, not imperative code.

**Why I believe this:**

1. **YAML defines structure** - jobs, triggers, permissions, concurrency
2. **TypeScript defines logic** - what happens inside steps
3. **They serve different purposes** - YAML = "when/where to run", TS = "what to run"

## What CAN Be TypeScript

| Component | Current | Can Be TS? | Value |
|-----------|---------|------------|-------|
| `setup/action.yml` | Shell + YAML | Maybe | Low - simple shell is fine |
| `check.yml` jobs | pnpm commands | No | Already simple |
| `release.yml` | changesets/action | No | Uses existing action |
| `claude.yml` | anthropics/claude-code-action | No | Uses existing action |
| `snapshot.yml` | pkg-pr-new | No | One-liner |
| `test-github-action-scratchpad.yml` | Our action | Already TS | Already dogfooding |

## What WOULD Benefit from TS

1. **Custom comment responders** - Like the `/or-ai` action
2. **PR automation** - Auto-labeling, review requests
3. **Issue triage** - Auto-assignment, label management
4. **Release notes** - Generating changelogs from commits

## Expected Conclusion

**The workflows themselves should stay YAML.** What we should dogfood is:
- The scratchpad action (already doing this)
- Add NEW actions for automation tasks
- Use platform-github for comment-triggered workflows

## Key Realization

The `setup/action.yml` is a **composite action**, not a workflow. It COULD theoretically be a Node action, but:
- It's mostly shell commands
- It needs to run BEFORE node is installed
- Converting it would be over-engineering

## What To Actually Do

1. **Keep workflows as YAML** - They're appropriate for the job
2. **Keep setup as composite** - It works, no need to change
3. **Add a PR automation action** - New TS action using platform-github
4. **Update scratchpad** - Use the new Comment/Issue/PR modules
