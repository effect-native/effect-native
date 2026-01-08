# Constraints Lens Analysis

**Core Question:** What's explicitly NOT supported? What are the hard boundaries and limitations?

**Context:** v0 for an elite mini-squad (Tom, Bramwell, AI agents), not a general-purpose public library.

---

## Gap 009: Rule API Shape

### What we explicitly NOT support in v0

- **Rule combinators/composition DSL** - No `Rule.and()`, `Rule.or()`, `Rule.sequence()`. Write multiple rules instead.
- **Dynamic rule enable/disable** - Rules are registered at startup; no runtime toggling.
- **Rule parameterization at runtime** - No "same rule, different thresholds" via config. Fork the rule.
- **Lifecycle hooks** - No `beforeRun`/`afterRun`. Just the check function.
- **Rule ordering constraints** - All rules are peers. If you need ordering, handle it at the caller.

### Hard boundaries

- Rules MUST return `Effect<Gap[]>`. No streams, no void-with-emission, no callbacks.
- Rules MUST be Effect-native. No promises, no sync functions.
- Rule failures are distinct from "no gaps found" - failures surface as Effect failures.

### Simplifying constraints

- Single context object (not dependency injection per rule) - rules get what the engine provides.
- String-based rule IDs - simple, human-readable, no tagged types.
- Metadata (description, tags) lives in the rule definition, not a separate registry.

---

## Gap 010: Gap Identity

### What we explicitly NOT support in v0

- **Semantic/fuzzy deduplication** - Two gaps match only if their identity fields match exactly. No "these seem related" heuristics.
- **Cross-session gap tracking** - Gaps are identified within a reconciliation run. No persistent gap history across process restarts.
- **Human-readable ID generation** - IDs are hashes or structural; no attempt to make them "nice" for humans.
- **Custom identity functions per gap type** - One identity mechanism, used uniformly.

### Hard boundaries

- Identity is computed from `_tag` + explicit identity fields, never from all fields.
- Two gaps with the same identity ARE the same gap. Period. No "same but different" states.
- Serialization must preserve identity - `deserialize(serialize(gap)).id === gap.id`.

### Simplifying constraints

- Identity is deterministic and pure - same inputs always produce same identity.
- Gap authors must explicitly mark which fields contribute to identity (or we use a simple convention like `_tag` + `key`).
- No object reference equality anywhere in the system.

---

## Gap 011: Resolution Matching

### What we explicitly NOT support in v0

- **Priority/ordering among resolutions** - First registered resolution for a gap type wins. No priority numbers.
- **Conditional matching beyond `_tag`** - No "only handle high-severity gaps" predicates. One resolution per gap type.
- **Dynamic resolution registration** - Resolutions registered at startup. No runtime add/remove.
- **Multi-gap batching** - Resolutions receive one gap at a time, not batches.
- **Resolution composition primitives** - No `Resolution.chain()`. Compose manually.

### Hard boundaries

- Every gap type has at most one resolution. Unmatched gaps escalate to Bramwell.
- Escalation to Bramwell ALWAYS succeeds (at the semantic level - write failures are retried).
- A resolution either handles a gap or it doesn't. No "partial handling."

### Simplifying constraints

- Match by `_tag` only - dead simple dispatch table.
- One resolution, one gap type - no ambiguity, no priority conflicts.
- Bramwell is the universal fallback, not a special-cased resolution.

---

## Gap 012: Actor Model

### What we explicitly NOT support in v0

- **Actor as a first-class API concept** - Actors are a mental model, not a data structure. No `Actor` type.
- **Capability inheritance/hierarchy** - No "senior-dev implies code-review." Flat capabilities.
- **Dynamic actor registration** - Actors are configured at startup. No runtime add/remove.
- **Load balancing or work distribution** - No round-robin, no queue management, no "least busy."
- **Actor availability/status** - Actors are either registered or not. No "temporarily unavailable."

### Hard boundaries

- Bramwell is always present and cannot be removed.
- Capability matching is exact string match. No fuzzy/semantic matching.
- Actor selection is deterministic - same gap, same state, same actor chosen.

### Simplifying constraints

- For v0, effectively two actors: "automation" (the engine + AI) and "Bramwell" (human fallback).
- Capabilities are just strings. No structured capability objects.
- No actor selection strategy - if automation can't handle it, Bramwell gets it.

---

## Gap 013: Loop Termination

### What we explicitly NOT support in v0

- **Resumable/checkpointed loops** - Loops run to completion or fail. No mid-loop persistence.
- **Configurable termination strategies** - One termination condition (see below).
- **Timeout-aware partial progress** - Loop either completes or times out entirely.
- **Dry-run mode** - If you want inspection without resolution, write rules that produce gaps but don't register resolutions.

### Hard boundaries

- Loop terminates when: no new gaps produced OR max iterations reached.
- Max iterations is a hard safety limit, not a normal exit condition.
- Escalated gaps count as "handled" for termination purposes - loop continues.

### Simplifying constraints

- Single-pass mode is the default. "Loop until stable" is opt-in.
- Termination reason is always reported: `stable`, `max_iterations`, or `error`.
- No time-based termination in v0 - use external timeout (Effect's `timeout`).

---

## Gap 014: Escalation Semantics

### What we explicitly NOT support in v0

- **Escalation failure handling** - Escalation always succeeds. If filesystem write fails, that's a system error, not an escalation failure.
- **Escalation metadata customization** - Fixed format for work orders. No "add extra context per escalation."
- **Resolution extension from Bramwell** - Bramwell fixes things manually. No automated "learn from human" loop.
- **Escalation routing** - All escalations go to Bramwell. No "escalate to Tom" or "escalate to on-call."

### Hard boundaries

- Escalation changes gap status to `escalated`. Not `resolved`, not `unresolved`.
- Escalated gaps are excluded from subsequent loop iterations (they're "handled").
- Work orders are append-only. Existing work orders are never modified by the engine.

### Simplifying constraints

- Three gap statuses: `unresolved`, `escalated`, `resolved`. Nothing else.
- Escalation = write to work orders. That's it. No notifications, no webhooks.
- Bramwell is a role, not a configurable target.

---

## Gap 015: Concurrency Model

### What we explicitly NOT support in v0

- **Parallel rule evaluation** - Rules run sequentially. Predictable, debuggable.
- **Parallel resolution execution** - Resolutions run sequentially. No races, no conflicts.
- **Swarm mode** - No multi-agent concurrency. One agent runs the loop.
- **Resource locking/coordination primitives** - No semaphores, no locks, no coordination.
- **Configurable concurrency limits** - No config because no concurrency.

### Hard boundaries

- All rule evaluation is sequential within a loop iteration.
- All resolution execution is sequential within a loop iteration.
- Effect fibers may be used internally, but from the user perspective, execution is sequential.

### Simplifying constraints

- v0 is single-threaded from the user's perspective.
- "Swarm mode" is a future capability, not a v0 requirement.
- Concurrency complexity is explicitly deferred - simpler to reason about, debug, and extend later.

---

## Gap 016: Service Boundaries

### What we explicitly NOT support in v0

- **Multiple persistence backends** - Filesystem only. No SQLite, no in-memory option for production.
- **Pluggable scheduler** - No cron, no interval. Manual trigger only.
- **OpenTelemetry integration** - Use Effect's built-in tracing. No OTel export.
- **Service configuration via env vars** - Configuration is programmatic (Layer composition).
- **Service auto-discovery** - All services explicitly provided or defaulted.

### Hard boundaries

- Engine exports: loop orchestration, gap identity, resolution dispatch, escalation.
- Caller provides: rules, gap types, resolutions.
- Work order sink is pluggable; everything else uses defaults.

### Simplifying constraints

- Defaults in the main package, not a separate `gaps-defaults` package.
- One `Engine.Default` layer that just works.
- Testing uses the same engine with different layers - no separate test harness.
- `WorkOrderSink` is the only pluggable service in v0.

---

## Synthesis

### v0 Non-Goals (Explicitly Deferred)

| Capability | Why Deferred |
|------------|--------------|
| Rule composition/combinators | YAGNI - write multiple rules |
| Dynamic rule/resolution registration | Adds complexity, startup config is sufficient |
| Gap history/persistence across restarts | v0 runs are standalone |
| Capability hierarchy | Flat capabilities cover elite mini-squad needs |
| Load balancing/work distribution | Only one "automation" actor in v0 |
| Parallel execution | Sequential is correct, debuggable, sufficient |
| Multi-backend persistence | Filesystem covers the use case |
| Scheduled/cron reconciliation | Manual trigger is fine for v0 |
| Resolution learning from Bramwell | Future ML/feedback loop |
| Partial/resumable loop execution | Loops are short enough to restart |

### Hard Boundaries (Invariants That Won't Change)

| Boundary | Rationale |
|----------|-----------|
| Rules return `Effect<Gap[]>` | Uniform interface, Effect-native |
| Gap identity is deterministic and pure | Foundation for deduplication |
| One resolution per gap type | No dispatch ambiguity |
| Bramwell is always present | System always has a fallback |
| Escalation = write to work orders | Simple, auditable, portable |
| Three gap statuses only | Clear state machine |
| Escalated gaps are "handled" | Loop termination is well-defined |
| Max iterations is a hard limit | Safety invariant |

### Simplifying Constraints (Complexity Reducers)

| Constraint | Complexity Saved |
|------------|------------------|
| Sequential execution | No race conditions, no locking, no coordination |
| String-based identifiers | No type machinery for IDs |
| Match by `_tag` only | Trivial dispatch table |
| Two effective actors | No actor selection strategy |
| One pluggable service | Minimal surface area |
| Fixed work order format | No schema negotiation |
| No lifecycle hooks | Rules are pure checks |
| No dry-run mode | Composition handles this |

### Recommended Decisions from CONSTRAINTS Perspective

1. **Rule API**: Function returning `Effect<Gap[]>`, string ID, metadata in definition. No combinators, no lifecycle.

2. **Gap Identity**: `_tag` + explicit `key` field (or convention). Deterministic hash. No semantic matching.

3. **Resolution Matching**: Simple `Map<string, Resolution>` keyed by gap `_tag`. First registration wins.

4. **Actor Model**: Don't model actors explicitly. "Automation resolves or Bramwell gets it." Period.

5. **Loop Termination**: Stop when no new gaps or max iterations. Escalated = handled. Report why.

6. **Escalation**: Write to work orders, change status to `escalated`, done. Bramwell is the only target.

7. **Concurrency**: Sequential everything. Defer swarm mode entirely. Use Effect fibers internally but present sequential semantics.

8. **Service Boundaries**: Export `Engine.Default` with filesystem work orders. Only `WorkOrderSink` is pluggable. Everything else is internal.

### The v0 Constraint Mantra

> "One rule, one gap type, one resolution, one actor (or Bramwell), one thread, one work order sink. Everything else is future."

This constraint set yields a system that:
- Is trivially correct (sequential, deterministic)
- Is trivially debuggable (no concurrency, no dynamic registration)
- Covers the elite mini-squad use case completely
- Has clear extension points for v1 (add concurrency, add actors, add backends)
