---
id: gap-006
phase: 1
status: resolved
blocked_by:
  - gap-004
  - gap-005
resolved_date: 2026-01-06
---

# Gap: Work Order Persistence Responsibility

## Question

Does the generic engine define how/where work orders (unresolved gaps) are persisted, or is that the caller's responsibility?

## Context

FSDB uses `.fsdb/workorders/`, but a generic engine might not assume filesystem. Need to know where the abstraction boundary is.

## Resolution

**Decision:** Pit-of-success at every level with pluggable overrides.

**Approach:** Follow Effect-TS ecosystem conventions:

1. **Opinionated defaults** - The engine provides sensible default persistence (e.g., filesystem-based) that works out of the box
2. **Pluggable/configurable** - Everything can be overridden following standard Effect service patterns
3. **Fully testable** - All persistence is behind service interfaces, enabling isolation testing with test implementations

**Effect-TS pattern:**

- Define a `GapSink` service interface (or similar) for persisting unresolved gaps
- Provide a `GapSinkLive` layer with filesystem defaults
- Tests use `GapSinkTest` layer with in-memory implementation
- Applications can provide custom layers as needed

This means the engine owns the abstraction but not the concrete implementation choice.
