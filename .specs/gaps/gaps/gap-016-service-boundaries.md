---
id: gap-016
phase: 2
status: open
blocked_by: []
---

# Gap: Service Boundaries

## Question

What are the core services the engine provides/requires?

- What services does @effect-native/gaps export?
- What services must the caller provide?
- Where is the abstraction boundary for persistence, logging, etc.?

## Context

Instructions say "pluggable everything" with Effect service patterns. Need to specify what's pluggable.

## User Stories & Jobs To Be Done

### Getting Started (Zero-Config Bootstrap)

**As Tom spinning up a new reconciliation loop:**
- I need sensible defaults so I can run a loop without configuring every service
- I need the engine to "just work" with minimal Layer composition
- I need clear documentation of what's provided vs what I must supply

**As an agent bootstrapping the engine programmatically:**
- I need a single entry point that accepts rules and runs them
- I need reasonable defaults for persistence (e.g., filesystem work orders)
- I need the engine to handle its own lifecycle (start, run, stop)

### Overriding Specific Services

**As Tom wanting a custom work order sink:**
- I need to swap the default work order writer without touching other services
- I need to provide my own `WorkOrderSink` implementation (e.g., Linear, Notion, stdout)
- I need the engine to accept my Layer and compose it with defaults

**As Tom wanting custom logging:**
- I need to plug in my own Logger service for observability
- I need trace correlation through the reconciliation loop
- I need structured logs that show gap → resolution → outcome flow

**As Tom wanting different persistence:**
- I need to swap filesystem persistence for in-memory (tests) or SQLite (production)
- I need the persistence abstraction to be minimal (read/write gap state, work orders)
- I need migrations/versioning to be the persistence layer's problem, not the engine's

### Testing Rules & Resolutions in Isolation

**As a rule author testing my rule:**
- I need to invoke my rule without the full engine running
- I need to provide mock context/dependencies for my rule's requirements
- I need to assert on the gaps produced without triggering resolutions

**As a resolution author testing my resolution:**
- I need to call my resolution with synthetic gaps
- I need to mock external services (API calls, filesystem writes)
- I need to verify my resolution succeeds/fails/partially-handles gaps correctly

**As an integration tester:**
- I need a test harness that runs the full loop but with in-memory services
- I need to simulate multiple reconciliation cycles
- I need to assert on work order generation without hitting real sinks

### Observability & Debugging

**As Tom debugging a stuck loop:**
- I need to see what rules ran, what gaps they found, and what resolutions attempted
- I need timing data for each phase (rule evaluation, resolution, work order write)
- I need to trace a specific gap through its lifecycle

**As Bramwell triaging work orders:**
- I need work orders to contain enough context to understand the gap
- I need to see which rule generated the gap and when
- I need to know if a gap has been seen before (recurrence)

**As an agent monitoring reconciliation:**
- I need health metrics (loop duration, gaps found, gaps resolved)
- I need alerts when loops fail or gaps accumulate
- I need to integrate with existing observability (OpenTelemetry, Effect tracing)

### Engine Exports vs Caller Provides

**What the engine MUST provide:**
- Loop orchestration (run rules → collect gaps → run resolutions → repeat)
- Gap deduplication and identity management
- Resolution matching (which resolution handles which gaps)
- Default escalation behavior (write to work order sink)
- Composable resolution helpers (chain, fallback, withEscalation)

**What the caller MUST provide:**
- Rules (domain-specific invariants)
- Gap types (domain-specific data structures)
- Resolutions (domain-specific fix logic)

**What should be pluggable with sensible defaults:**
- `WorkOrderSink` - where unresolved gaps go (default: filesystem)
- `Logger` - how to log (default: Effect's built-in)
- `Clock` - time source (default: real clock, test: controllable)
- `Scheduler` - when loops run (default: on-demand, optional: cron/interval)
- `GapStore` - persisted gap state for deduplication (default: in-memory per loop)

### Layer Composition Patterns

**As a caller using defaults:**
- I need `Engine.Default` layer that works out of the box
- I need to provide only my rules and gap types

**As a caller overriding one service:**
- I need `Engine.Default.pipe(Layer.provide(MyWorkOrderSink))` pattern to work
- I need clear errors if I provide an incompatible layer

**As a caller in a test:**
- I need `Engine.Test` layer with in-memory everything
- I need helpers to inspect internal state (gaps seen, work orders written)

### Key Questions These Stories Raise

1. **Service granularity:** Is `WorkOrderSink` one service or split into `WorkOrderWriter` + `WorkOrderReader`?
2. **Default implementations:** Are defaults in the engine package or a separate `@effect-native/gaps-defaults`?
3. **Live vs Test layers:** Should `Engine.Live` and `Engine.Test` be separate exports?
4. **Configuration:** How are services configured (env vars, explicit config object, both)?
5. **Service discovery:** Can services depend on each other? (e.g., `GapStore` needs `FileSystem`)

## Resolution

(pending)
