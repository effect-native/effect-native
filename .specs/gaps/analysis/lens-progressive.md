# Progressive Disclosure Analysis

Analyzing @effect-native/gaps through the lens of user experience progression: from zero-config "just works" to power-user customization.

---

## Gap 009: Rule API Shape

### Simplest Default That "Just Works"
A single function signature that takes context and returns gaps:
```
rule = (context) => Gap[]
```
No classes, no interfaces, no type parameters to understand. Write a function, return gaps. Done.

**Day 1 experience:** Copy an example rule, modify the detection logic, return your gaps. The engine handles the rest.

### What Power Users Need
- Type parameters for custom gap data shapes
- Dependency injection for testing/mocking
- Lifecycle hooks (beforeRun/afterRun) for instrumentation
- Rule combinators for composition (combine, conditionally enable, parameterize)
- Explicit error boundaries (rule fails vs "no gaps found")

### How Users Discover They Need Advanced Options
- **Type errors accumulate** - they want stronger typing for gap data
- **Testing becomes painful** - they need to mock dependencies
- **Rules get repetitive** - they want parameterization and composition
- **Debugging is hard** - they want lifecycle hooks and better tracing

---

## Gap 010: Gap Identity

### Simplest Default That "Just Works"
Auto-generated identity from `_tag` + content hash. Users don't think about identity at all - they describe the violation, the engine handles deduplication.

**Day 1 experience:** Return gaps from rules. Same gap = same identity. Duplicates are automatically merged. No configuration required.

### What Power Users Need
- Explicit control over identity fields (which fields contribute, which are metadata)
- Custom identity functions for complex deduplication logic
- Visibility into identity computation for debugging
- Stable, human-readable IDs for cross-system references
- Override capability to force gaps to be distinct or merged

### How Users Discover They Need Advanced Options
- **False deduplication** - semantically different gaps are getting merged
- **Missing deduplication** - same violation creates duplicate work orders
- **Cross-session confusion** - gaps "disappear" after restart
- **Debugging mysteries** - "why did these gaps merge/not merge?"

---

## Gap 011: Resolution Matching

### Simplest Default That "Just Works"
Match resolution to gap by `_tag`. One resolution per gap type, registered simply:
```
engine.resolve("MissingFile", (gap) => createFile(gap.path))
```

Unmatched gaps automatically escalate to Bramwell. No configuration for fallback - it's just how the system works.

**Day 1 experience:** Define gap types, define resolutions with matching tags. Gaps find their handlers automatically.

### What Power Users Need
- Multi-gap handlers (one resolution handles several gap types)
- Conditional matching beyond `_tag` (by severity, source, metadata)
- Priority/ordering control when multiple resolutions match
- Capability-based matching (only match if capability available)
- Dynamic registration/deregistration at runtime
- Custom fallback behavior beyond Bramwell escalation

### How Users Discover They Need Advanced Options
- **Handler duplication** - same logic repeated for multiple gap types
- **Over-matching** - resolution handles gaps it shouldn't
- **Missing control** - need to prefer one resolution over another
- **Runtime needs** - actors come and go, resolutions need to adapt

---

## Gap 012: Actor Model

### Simplest Default That "Just Works"
Two actors pre-configured:
1. **Engine** - handles everything it can automatically
2. **Bramwell** - receives everything the engine can't handle

No capability modeling, no routing logic. Gaps either auto-resolve or go to Bramwell.

**Day 1 experience:** You don't think about actors at all. The system resolves what it can and escalates the rest.

### What Power Users Need
- Register additional actors (AI agents, other humans, external systems)
- Define capabilities and route gaps to capable actors
- Dynamic actor availability (disable, remove, re-add)
- Selection strategies (priority, load balancing, affinity)
- Explicit assignment to override auto-routing
- Visibility into routing decisions

### How Users Discover They Need Advanced Options
- **Bramwell overloaded** - too many escalations, need more hands
- **Specialized agents** - want different AI for different tasks
- **Team growth** - more people/agents joining the squad
- **Routing mysteries** - "why did this gap go to X instead of Y?"

---

## Gap 013: Loop Termination

### Simplest Default That "Just Works"
Loop runs until stable (no new actionable gaps) with a sensible max iteration limit (e.g., 10 cycles). If max hit, terminate with clear message.

**Day 1 experience:** Call `reconcile()`. It runs until done or hits the safety limit. You get a clear result: stable, max-iterations, or error.

### What Power Users Need
- Single-pass mode (dry run, assessment only)
- Custom termination conditions
- Configurable max iterations and timeouts
- Resume from interrupted loops
- Different termination semantics (stop on first escalation vs continue)
- Termination callbacks/hooks

### How Users Discover They Need Advanced Options
- **Want preview first** - need single-pass to see gaps before fixing
- **Loops taking too long** - need tighter timeouts
- **Hitting max iterations** - need to understand why stability is unreachable
- **Crashes/interrupts** - need resumption, not restart from scratch
- **Resource constraints** - need time budgets respected

---

## Gap 014: Escalation Semantics

### Simplest Default That "Just Works"
Escalated = "handed off, loop can continue." Escalation always succeeds (writing to work orders is best-effort with retries). Loop terminates cleanly when only escalated gaps remain.

**Day 1 experience:** Gaps that can't auto-resolve appear in work orders. The loop finishes. Bramwell reviews work orders later. When the underlying issue is fixed, the work order auto-closes on next reconciliation.

### What Power Users Need
- Different escalation targets (not just Bramwell)
- Custom data in escalation (what to include for manual review)
- Escalation failure handling (what if work order write fails?)
- Explicit status queries (unresolved vs escalated vs resolved)
- Escalation-to-automation pipeline (turn manual fixes into rules)

### How Users Discover They Need Advanced Options
- **Work orders lack context** - need richer data for Bramwell
- **Escalation failures** - disk full, permissions, need handling
- **Status confusion** - "is this gap handled or not?"
- **Repeated escalations** - want to automate common manual fixes

---

## Gap 015: Concurrency Model

### Simplest Default That "Just Works"
Sequential by default. Rules run one at a time, resolutions run one at a time. Predictable, easy to reason about, no race conditions.

**Day 1 experience:** Everything runs in order. You can follow the log like a story. No surprises.

### What Power Users Need
- Parallel rule evaluation for large rule sets
- Parallel resolution execution for independent fixes
- Concurrency limits (don't overwhelm APIs)
- Isolation and conflict detection for concurrent work
- Execution mode selection (sequential for debugging, parallel for speed)
- Visibility into concurrent state

### How Users Discover They Need Advanced Options
- **Reconciliation too slow** - hundreds of rules, taking forever
- **Scale demands** - swarm mode with multiple agents
- **Rate limits hit** - need bounded concurrency for external APIs
- **Conflicts occur** - concurrent edits corrupting state

---

## Gap 016: Service Boundaries

### Simplest Default That "Just Works"
`Engine.Default` layer with everything built-in:
- Work orders go to filesystem
- Logging via Effect's built-in
- In-memory gap store (per loop)
- Real clock, on-demand scheduling

User provides only: Rules + Gap types + Resolutions.

**Day 1 experience:** 
```
import { Engine } from '@effect-native/gaps'
const program = Engine.reconcile(myRules)
Effect.runPromise(program.pipe(Effect.provide(Engine.Default)))
```

### What Power Users Need
- Swap work order sink (Linear, Notion, stdout, custom)
- Custom logging/tracing (OpenTelemetry integration)
- Different persistence (SQLite for production, in-memory for tests)
- Test layer with inspection capabilities
- Configuration via env vars or explicit config
- Granular service replacement without touching others

### How Users Discover They Need Advanced Options
- **Testing needs** - need in-memory services, state inspection
- **Integration needs** - work orders should go to Linear, not files
- **Observability needs** - need tracing through existing systems
- **Production needs** - need durable persistence, not in-memory

---

# Synthesis

## Day 1 Experience (Zero Config)

What works out of the box:

| Capability | Default Behavior |
|------------|------------------|
| **Define rules** | Write functions that return gaps |
| **Gap identity** | Auto-computed from tag + content |
| **Resolution matching** | Match by `_tag`, auto-escalate unmatched |
| **Actors** | Just Engine + Bramwell |
| **Loop termination** | Run until stable, max 10 iterations |
| **Escalation** | Write to work orders, loop continues |
| **Concurrency** | Sequential - predictable, safe |
| **Services** | Everything provided via `Engine.Default` |

**The pit of success:** Write rules, define resolutions by tag, call `reconcile()`. Gaps find resolutions or escalate to Bramwell. System reaches stability or explains why not.

## Graduation Triggers

Users discover they need more when:

| Signal | Graduation Path |
|--------|-----------------|
| Type errors accumulate | Need typed rule API with generics |
| False dedup / missing dedup | Need explicit identity control |
| Resolution logic repeats | Need multi-gap handlers, composition |
| Bramwell overloaded | Need more actors, capability routing |
| Loop too slow | Need parallel execution |
| Loops hang or hit limits | Need custom termination, timeouts |
| Work orders lack context | Need custom escalation data |
| Testing is painful | Need `Engine.Test` layer, mocks |
| Need different sinks | Need service replacement |

## Power User Capabilities

What advanced users can customize:

| Area | Customization |
|------|---------------|
| **Rule API** | Type params, DI, lifecycle hooks, combinators |
| **Gap Identity** | Explicit identity fields, custom functions |
| **Resolution Matching** | Conditional matching, priority, capabilities |
| **Actor Model** | Register actors, define capabilities, routing strategies |
| **Loop Termination** | Single-pass, custom conditions, resume |
| **Escalation** | Custom targets, rich data, failure handling |
| **Concurrency** | Parallel execution, limits, isolation |
| **Services** | Swap any service, test layers, observability |

## Recommended Decisions

From the Progressive Disclosure perspective:

### 1. Rule API: Function-First with Optional Enhancement

**Recommend:** Simple function works; power users opt into interface/class for metadata, types, and composition.

```
// Day 1: Just a function
const myRule = (ctx) => [{ _tag: "Missing", path: "/foo" }]

// Power user: Full interface
const myRule = Rule.make({
  name: "check-files",
  tags: ["core"],
  check: (ctx) => ...
})
```

### 2. Gap Identity: Automatic with Explicit Override

**Recommend:** Auto-compute from `_tag` + data hash. Power users add `id` field or `identity()` function to override.

### 3. Resolution Matching: Tag-Based Default, Capability-Based Opt-In

**Recommend:** `_tag` matching is the default. Introduce capabilities/conditions only when registering handlers that need them.

### 4. Actor Model: Hidden Until Needed

**Recommend:** Engine + Bramwell are implicit. Actor API only surfaces when user calls `engine.registerActor()`. Day 1 users never see actor concepts.

### 5. Loop Termination: Sensible Limits, Single Config Knob

**Recommend:** Default max iterations and timeout. One config option: `{ maxIterations: 20, timeout: "5m" }`. Single-pass mode via `engine.assess()` vs `engine.reconcile()`.

### 6. Escalation: Just Works, Customizable Later

**Recommend:** Escalation = write work order + mark handled. Power users provide custom `EscalationSink` or add data via `gap.escalationContext`.

### 7. Concurrency: Sequential Default, Parallel Opt-In

**Recommend:** Sequential is the safe default. Parallel via explicit config: `engine.reconcile({ parallel: true })` or `engine.reconcile({ concurrency: 4 })`.

### 8. Services: Batteries Included, Replaceable

**Recommend:** `Engine.Default` works out of the box. Power users replace services via Layer composition. `Engine.Test` is a separate export for testing.

---

## The Golden Path

```
Day 1:     Write rules -> Call reconcile() -> Gaps handled or escalated
           (No config, no types, no actors, no concurrency)

Week 1:    Add type safety to gaps, customize escalation data
           (Triggered by: type errors, insufficient work order context)

Month 1:   Register AI agents, enable parallel execution, custom sinks
           (Triggered by: scale, speed, integration needs)

Mature:    Custom identity, capability routing, resumable loops, full observability
           (Triggered by: edge cases, production hardening)
```

Each stage is opt-in. Users never see complexity until they need it.
