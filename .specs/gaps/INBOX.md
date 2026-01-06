# Homeostatic Reconciliation Engine - Brain Dump Inbox

Captured from conversation on 2026-01-06.

## Core Concept

A general-purpose reconciliation engine based on the pattern:

1. **Define rules** - Invariants that should hold true
2. **Rules fail with gaps** - Violations of invariants surface as typed errors
3. **Resolutions attempt to close gaps** - Automated or manual
4. **Unresolved gaps escalate to Bramwell** - Default behavior
5. **Loop until stable** - Only Bramwell-resolvable gaps remain

## Key Insight: Gaps as Errors

Use Effect's error channel for gaps:

- **Rule success** = invariant holds, no gaps
- **Rule failure** = invariant violated, `GapsFound<Gap>` error contains gap array
- **Resolution success** = all gaps handled
- **Resolution failure** = remaining gaps in error channel

This leverages all existing Effect-TS ecosystem patterns for exceptional situations.

## Rule Signature

```typescript
type Rule<Ctx, Gap, R> = (ctx: Ctx) => Effect.Effect<void, GapsFound<Gap>, R>

class GapsFound<G> extends Data.TaggedError("GapsFound")<{
  gaps: ReadonlyArray<G>
}> {}
```

Rules are custom TypeScript functions taking an expected kwargs shape, returning `Effect.Effect<success, gaps, dependencies>`.

## Gap Types

Gaps are tagged data (not errors themselves):

```typescript
class MissingIssueFolder extends Data.TaggedClass("MissingIssueFolder")<{
  repo: RepoConfig
  issue: GitHubIssue
}> {}

class StaleMetadata extends Data.TaggedClass("StaleMetadata")<{
  path: string
  expected: unknown
  actual: unknown
}> {}
```

Gaps need stable deterministic identity for deduplication and work order matching.

## Resolution Signature

```typescript
type Resolution<G extends Gap, R> = (
  gaps: ReadonlyArray<G>
) => Effect.Effect<void, GapsFound<G>, R>
```

Resolution takes gaps, does stuff, succeeds if all handled or fails with remaining unhandled gaps.

## Escalation Pattern

Default resolution = escalate to Bramwell:

- Write gap to work orders location
- Gap is "handled" by becoming visible (success, not failure)
- Bramwell whack-a-moles through work orders manually
- Gradually extends rules to handle more specific gaps automatically

## Resolution Composition

```typescript
// Try specific resolution, fall back to escalation
const withEscalation = <G extends Gap, R>(
  specific: Resolution<G, R>
): Resolution<G, R | FileSystem> =>
  (gaps) => specific(gaps).pipe(
    Effect.catchTag("GapsFound", (e) => escalateToBramwell(e.gaps))
  )

// Chain multiple resolutions
const chainResolutions = <G extends Gap, R>(
  ...resolutions: Array<Resolution<G, R>>
): Resolution<G, R>
```

## Work Order Lifecycle

- Generated from unresolved gaps
- Written to disk for Bramwell visibility
- Auto-close when gap no longer exists (detected on next reconciliation)
- Regenerate each loop - work orders are for visibility, not for driving execution

## Example Applications

Beyond FSDB, this pattern applies to:

- **Code quality:** Every PR must pass lint (rule runs lint scripts, fails with gaps when dirty)
- **AI-detected patterns:** No duplicate issues (AI determines duplicates, escalates to Bramwell)
- **Organizational rules:** Every issue theme must have umbrella issue
- **External constraints:** Every PR must have review approval

Can be used for literally everything with "rules that should be true."

## Inspiration

React Reconciler, but for filesystem + git state instead of DOM trees:

```
Rules → Gaps → WorkOrders → Execution
  │       │         │
  ▼       ▼         ▼
"What   "What's   "What work
should   wrong?"   fixes it?"
be true?"
```

## Open Design Questions

### 1. Package Structure

- Separate package: `packages/homeostatic/` or `@effect-native/reconciler`
- Or internal module within fsdb for now?

Leaning toward separate package since "we can use this for literally everything."

### 2. Naming

Options:

- `@effect-native/reconciler`
- `@effect-native/homeostatic`
- `@effect-native/rules`

### 3. Work Order Sink

Should engine define:

- Abstract `WorkOrderSink` service (write gap somewhere)
- Or just return unresolved gaps and let caller handle persistence?

### 4. Gap Specificity Hierarchy

Should gaps have inheritance hierarchy, or stay flat with resolution matching handling specificity?

### 5. Concurrent Gap Resolution

How to distribute gap resolution concurrently? Defer to later - start with sequential, Bramwell fallback.

## Relationship to FSDB

FSDB-pull is the first application of this engine:

- Specific rules (open issues exist, PRs have worktrees)
- Specific gap types (MissingIssueFolder, StaleMetadata)
- Specific resolutions (create folder, fetch from API)
- GitHub API as data source
- `.fsdb/workorders/` as escalation sink
