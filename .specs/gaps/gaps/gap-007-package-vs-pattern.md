---
id: gap-007
phase: 1
status: resolved
blocked_by:
  - gap-002
  - gap-003
  - gap-004
resolved_date: 2026-01-06
---

# Gap: Package vs Pattern

## Question

Is this a concrete npm package (`@effect-native/homeostatic`) or a documented pattern that applications implement?

## Context

Affects whether we're specifying an API or a conceptual framework. A package has versioning, dependencies, tests. A pattern is just documentation.

## Resolution

**Decision:** Concrete npm package: `@effect-native/gaps`

This is a real package with:

- Versioning
- Dependencies (Effect-TS)
- Tests
- Published API

Not just documentation. Real code that FSDB and other applications depend on.
