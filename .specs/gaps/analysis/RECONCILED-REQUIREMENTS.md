# Reconciled Product Requirements

## 5-Lens Synthesis Matrix

This document reconciles findings from 5 orthogonal lenses applied to gaps 009-016.

---

## Lens Agreement Matrix

| Gap | Value | Mental Model | Constraints | Failure | Progressive |
|-----|-------|--------------|-------------|---------|-------------|
| **009 Rule API** | Function returning `Effect<Gap[]>` | Rule = detector (like lint) | No combinators, no lifecycle | Fail loud on malformed | Simple function first |
| **010 Gap Identity** | Hash of tag + key fields | Content-addressed (like git) | No semantic matching | Err toward more IDs | Auto with override |
| **011 Resolution Matching** | Match by `_tag`, Bramwell fallback | Pattern matching dispatch | One resolution per type | No silent match → Bramwell | Tag-based default |
| **012 Actor Model** | First-match capable actor | Team roles with capabilities | No actors in v0 API | Bramwell always available | Hidden until needed |
| **013 Loop Termination** | Stable OR max-iterations | Homeostasis as goal | Single termination mode | Always report why stopped | Sensible defaults |
| **014 Escalation Semantics** | 3-state: unresolved/escalated/resolved | Escalation = delegation not failure | Bramwell only target | Escalation must be infallible | Just works |
| **015 Concurrency** | Sequential default, opt-in parallel | Sequential = predictable | No concurrency in v0 | Isolate failures | Sequential default |
| **016 Service Boundaries** | Zero-config + override per service | Engine provides / Caller provides | WorkOrderSink only pluggable | Fail fast on missing | Batteries included |

---

## Consensus Decisions (All Lenses Agree)

### Gap 009: Rule API Shape

**DECISION: Rules are typed functions returning Effect<Gap[]>**

- **Signature**: `(context: Context) => Effect.Effect<Gap[], RuleError, R>`
- **Identity**: String-based rule ID for logging/debugging
- **Context**: Single object containing all dependencies
- **No v0 features**: combinators, lifecycle hooks, runtime parameterization

**Rationale (all lenses)**:
- Value: Enables confident rule authoring
- Mental Model: Matches lint rules users already understand
- Constraints: Simplest viable contract
- Failure: Type errors surface at compile time
- Progressive: Copy-paste to start, enhance later

---

### Gap 010: Gap Identity

**DECISION: Content-addressed identity from `_tag` + explicit key fields**

- **Mechanism**: Deterministic hash computed from `_tag` + user-declared identity fields
- **Default**: If no identity fields declared, use `_tag` + all fields
- **Stability**: Identity survives serialization
- **No v0 features**: custom identity functions, semantic matching, cross-session persistence

**Rationale (all lenses)**:
- Value: Trustworthy deduplication
- Mental Model: "Same content = same gap" (like git)
- Constraints: Pure, deterministic, no custom logic
- Failure: Err toward more identities (duplicates > lost gaps)
- Progressive: Auto-compute default, override when needed

---

### Gap 011: Resolution Matching

**DECISION: Dispatch by `_tag` with mandatory Bramwell fallback**

- **Dispatch**: `Map<GapTag, Resolution>` - one resolution per gap type
- **Fallback**: Unmatched gaps escalate to Bramwell (always)
- **Registration**: At startup, not runtime
- **No v0 features**: conditional matching, priority, multi-type handlers

**Rationale (all lenses)**:
- Value: Gaps either auto-resolve or reach a human
- Mental Model: Pattern matching (like Express routing)
- Constraints: Trivial dispatch table
- Failure: No silent drops - Bramwell catches all
- Progressive: Tag matching is enough for Day 1

---

### Gap 012: Actor Model

**DECISION: Implicit 2-actor model (Engine + Bramwell)**

- **Engine**: Handles all gaps it has resolutions for
- **Bramwell**: Catches everything else (hardcoded, always present)
- **No explicit Actor API in v0**: Actors are a mental model, not a data structure
- **No v0 features**: capability matching, dynamic registration, load balancing

**Rationale (all lenses)**:
- Value: Work goes somewhere - never dropped
- Mental Model: Bramwell as "senior team member" 
- Constraints: Two actors simplifies everything
- Failure: Bramwell cannot be offline
- Progressive: Actor concept hidden until user asks for more

---

### Gap 013: Loop Termination

**DECISION: Terminate on stable OR max-iterations, always report reason**

- **Stable**: No new actionable gaps (escalated gaps are "handled")
- **Max iterations**: Hard safety limit (default: 10)
- **Timeout**: External (use Effect's timeout)
- **Termination reason**: Enum `stable | max_iterations | error`
- **No v0 features**: resumption, checkpointing, custom termination conditions

**Rationale (all lenses)**:
- Value: Bounded, predictable execution
- Mental Model: System seeks homeostasis
- Constraints: One termination strategy
- Failure: Must never lie about why it stopped
- Progressive: Default limits work, adjust as needed

---

### Gap 014: Escalation Semantics

**DECISION: Three-state model, escalation = success**

- **States**: `unresolved` → `escalated` | `resolved`
- **Escalation outcome**: Gap marked `escalated`, loop continues
- **Work order content**: Gap details, attempted resolutions, failure reasons
- **Escalation target**: Bramwell only
- **No v0 features**: custom targets, escalation failure handling, learning loops

**Rationale (all lenses)**:
- Value: Bramwell sees actionable items
- Mental Model: Escalation = delegation, not failure
- Constraints: 3 states only, Bramwell only target
- Failure: Escalation must be semantically infallible
- Progressive: Just works, customize later

---

### Gap 015: Concurrency Model

**DECISION: Sequential execution only in v0**

- **Rules**: Evaluate sequentially
- **Resolutions**: Execute sequentially
- **No v0 features**: parallel execution, isolation, conflict detection, swarm mode

**Rationale (all lenses)**:
- Value: Correctness before speed
- Mental Model: Easy to follow, easy to debug
- Constraints: Major complexity removed
- Failure: No race conditions, no coordination failures
- Progressive: Parallel is opt-in for v1

---

### Gap 016: Service Boundaries

**DECISION: Zero-config with one pluggable service (WorkOrderSink)**

- **Engine.Default layer**: Works out of the box
- **Caller provides**: Rules, Gap types, Resolutions
- **Pluggable (v0)**: WorkOrderSink only
- **Defaults**: Filesystem work orders, Effect logging, in-memory gap store
- **No v0 features**: multiple pluggable services, OTel, env var config

**Rationale (all lenses)**:
- Value: Start immediately, grow as needed
- Mental Model: Engine provides / Caller provides is clear
- Constraints: Minimal pluggable surface
- Failure: Fail fast on missing required inputs
- Progressive: Batteries included, swap one thing at a time

---

## Resolved Gap Statuses

| Gap | Status | Decision |
|-----|--------|----------|
| gap-009 | **RESOLVED** | Function `(ctx) => Effect<Gap[]>` with string ID |
| gap-010 | **RESOLVED** | Content-addressed identity from `_tag` + key fields |
| gap-011 | **RESOLVED** | Dispatch by `_tag`, mandatory Bramwell fallback |
| gap-012 | **RESOLVED** | Implicit Engine + Bramwell, no Actor API |
| gap-013 | **RESOLVED** | Stable OR max-iterations, report reason |
| gap-014 | **RESOLVED** | 3-state (unresolved/escalated/resolved), escalation = success |
| gap-015 | **RESOLVED** | Sequential only in v0 |
| gap-016 | **RESOLVED** | Zero-config, WorkOrderSink only pluggable |

---

## Core Vocabulary (Final)

1. **Rule** - A function that detects gaps
2. **Gap** - A detected drift between desired and actual state
3. **Resolution** - A handler that closes gaps
4. **Bramwell** - The human fallback (always present)
5. **Escalation** - Handing a gap to Bramwell
6. **Stable** - The goal state: no actionable gaps remain
7. **Work Order** - Artifact created for escalated gaps

---

## The v0 Product in One Sentence

> Write rules that detect gaps, write resolutions that fix them by tag, and everything that can't be fixed automatically goes to Bramwell.

---

## What v0 Does NOT Do (Explicit Non-Goals)

1. **No actors beyond Engine + Bramwell**
2. **No concurrent execution**
3. **No capability-based routing**
4. **No gap persistence across runs**
5. **No rule composition primitives**
6. **No conditional resolution matching**
7. **No resumable loops**
8. **No pluggable services except WorkOrderSink**

These are v1+ features with clear graduation paths.

---

## Next Steps

1. Write EARS-format requirements based on these decisions
2. Design technical architecture (separate phase)
3. Implement v0

---

## Appendix: Lens-Specific Insights Worth Preserving

### From Value Lens
> "Usability before power. Every decision should optimize for first reconciliation loop works before optimizing for advanced scenarios."

### From Mental Model Lens
> "The system is a homeostatic organism seeking balance. Bramwell being a proper name rather than the fallback humanizes the system."

### From Constraints Lens
> "One rule, one gap type, one resolution, one actor (or Bramwell), one thread, one work order sink. Everything else is future."

### From Failure Lens
> "Gap identity errors should surface as noise (duplicate work orders), not silence (lost gaps). Annoying > catastrophic."

### From Progressive Disclosure Lens
> "Each stage is opt-in. Users never see complexity until they need it."
