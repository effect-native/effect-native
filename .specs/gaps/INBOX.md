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

---

## Hyperslice Analysis of JTBD Space

_Analysis performed 2026-01-07 using Hyperslice methodology on all jobs-to-be-done from gaps 009-016._

### The Hyperblob

All jobs-to-be-done for the homeostatic reconciliation engine, spanning: rule authoring, gap detection, resolution matching, actor routing, loop control, escalation, concurrency, and service boundaries.

### Cardinal Slices Discovered

#### Slice 1: Actor Dimension
- **Razor**: Who performs the job?
- **Blob A**: "System jobs" — engine internals, loop orchestration, matching logic
- **Blob B**: "Human/Agent jobs" — Tom configuring, Bramwell reviewing, agents executing
- **Implication**: Clean API boundary. System jobs = internal services. Human/Agent jobs = public surface area.

#### Slice 2: Temporal Dimension
- **Razor**: When in the lifecycle?
- **Blob A**: "Design-time jobs" — authoring rules, defining gap types, registering resolutions
- **Blob B**: "Run-time jobs" — executing rules, dispatching gaps, terminating loops
- **Implication**: Configuration is separate from execution. Rules/resolutions are provided, not discovered.

#### Slice 3: Data Flow Direction
- **Razor**: Information in or out?
- **Blob A**: "Observation jobs" — detecting gaps, querying status, understanding why loop stopped
- **Blob B**: "Mutation jobs" — closing gaps, writing work orders, updating state
- **Implication**: Read services vs write services. Effect-native pattern: separate Reader/Writer services.

#### Slice 4: Success Definition ⭐ CARDINAL
- **Razor**: What counts as "done"?
- **Blob A**: "Convergence jobs" — gap actually closed, invariant restored
- **Blob B**: "Handoff jobs" — escalated to Bramwell, work order written, visibility achieved
- **KEY INSIGHT**: **"Handled" ≠ "Resolved"**
  - Resolved = gap no longer exists
  - Handled = someone owns it (may still exist)
  - Escalated = Bramwell owns it (special case of handled)
- **Design Decision**: Gap status must be a 3-state enum: `unresolved | escalated | resolved`

#### Slice 5: Certainty Level
- **Razor**: Deterministic or judgment-required?
- **Blob A**: "Mechanical jobs" — type-based matching, deduplication, iteration counting
- **Blob B**: "Judgment jobs" — actor capability matching, what counts as "same gap", when to escalate
- **Implication**: Mechanical jobs → automate in v0. Judgment jobs → default to Bramwell, automate incrementally.

#### Slice 6: Isolation Boundary ⭐ CARDINAL
- **Razor**: Single unit or coordination required?
- **Blob A**: "Independent jobs" — test one rule, run one resolution, check one gap's identity
- **Blob B**: "Coordination jobs" — parallel execution, conflict detection, cross-actor routing
- **KEY INSIGHT**: **v0 must nail independent jobs. Coordination is v1.**
  - If you can't test a rule in isolation, the API is wrong
  - If you can't run one resolution without the engine, the abstraction leaks
- **Design Decision**: All core types (Rule, Gap, Resolution) must be usable standalone.

#### Slice 7: Failure Mode ⭐ CARDINAL
- **Razor**: What breaks?
- **Blob A**: "Silent failures" — gaps lost, work orders never written, dedup incorrectly merges
- **Blob B**: "Loud failures" — rule throws, resolution crashes, escalation write fails
- **KEY INSIGHT**: **Silent failures are catastrophic. Loud failures are recoverable.**
  - Silent: Gap exists but engine doesn't surface it → invariant violated, nobody knows
  - Loud: Rule throws → error propagates, Bramwell sees it, system is honest
- **Design Decision**: Every silent failure path must become loud. No `catch unreachable` on gap flows.

### Punnett Squares Discovered

**From Slices 4 × 6 (Success × Isolation)**:

|                    | Independent | Coordination |
|--------------------|-------------|--------------|
| **Convergence**    | Unit test a resolution | Parallel resolution race |
| **Handoff**        | Single gap → work order | Batch escalation |

**From Slices 3 × 5 (Data Flow × Certainty)**:

|                    | Observation | Mutation |
|--------------------|-------------|----------|
| **Mechanical**     | Query gap status | Write deduped gap |
| **Judgment**       | "Is this the same gap?" | "Should we escalate?" |

The judgment/mutation cell ("Should we escalate?") is where Bramwell lives. Everything else can be automated.

### Empty Cells (Predicted but Undiscovered)

1. **Coordination + Silent Failure**: What happens when parallel resolutions both think they handled the same gap? → Need conflict detection or last-write-wins semantics.

2. **Design-time + Observation**: How do you preview what gaps a rule would find without running it? → Dry-run mode for rules.

3. **Judgment + Independent**: An AI agent deciding in isolation whether to escalate → Needs capability/confidence metadata on gaps.

### Design Recommendations from Hyperslice

1. **Three-state gap status** (from Slice 4): `unresolved | escalated | resolved`

2. **Standalone types** (from Slice 6): Rule, Gap, Resolution must work without engine

3. **No silent failures** (from Slice 7): All paths that lose gaps must error loudly

4. **Separate Read/Write services** (from Slice 3): `GapStore.get` vs `GapStore.put`

5. **v0 = Sequential + Bramwell fallback** (from Slices 5, 6): Defer coordination to v1

6. **Judgment defaults to Bramwell** (from Slice 5): When uncertain, escalate

### Robustness Ranking

Slices ordered by reproducibility (would independent observers make the same cut?):

1. **Slice 4 (Success Definition)** — Extremely robust. "Did the gap go away?" is measurable.
2. **Slice 7 (Failure Mode)** — Very robust. Silent vs loud is observable.
3. **Slice 6 (Isolation)** — Robust. "Can I test this alone?" is testable.
4. **Slice 2 (Temporal)** — Robust. Config vs runtime is standard software pattern.
5. **Slice 3 (Data Flow)** — Moderately robust. Read vs write sometimes blurs (upsert?).
6. **Slice 1 (Actor)** — Less robust. "Who" can be ambiguous for automated agents.
7. **Slice 5 (Certainty)** — Least robust. "Judgment required" is itself a judgment call.
