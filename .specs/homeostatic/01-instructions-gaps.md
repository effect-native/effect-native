# Phase 1: Instructions - Gaps

**Invariant:** Zero uncertainty about the raw intent, context, and high-level goals.

## Open Gaps

### Gap 1: Primary Problem Statement

**Question:** What is the single-sentence problem this solves?
**Context:** Need crisp articulation of the core pain point.
**Status:** Open

### Gap 2: Target Users

**Question:** Who uses this system? (Developers? Agents? Both?)
**Context:** Need to understand if this is a library for developers to build reconcilers, or a runtime for agents, or both.
**Status:** Open

### Gap 3: Relationship to Effect-TS

**Question:** Is this an Effect-TS library following their patterns, or a standalone concept that uses Effect?
**Context:** Affects how we describe the user story and goals.
**Status:** Open

### Gap 4: Scope of "Reconciliation"

**Question:** Is this specifically for filesystem/external-state reconciliation, or a general pattern for any "rules that should be true"?
**Context:** The INBOX mentions both FSDB-specific and general applications (lint, AI dedup, etc.)
**Status:** Open

### Gap 5: Bramwell Dependency

**Question:** Is Bramwell (human escalation) a core concept of the engine, or an FSDB-specific application?
**Context:** Need to know if "escalation to human" is part of the generic engine or just one possible resolution strategy.
**Status:** Open

### Gap 6: Work Order Persistence

**Question:** Does the generic engine define how/where work orders are persisted, or is that the caller's responsibility?
**Context:** FSDB uses `.fsdb/workorders/`, but a generic engine might not assume filesystem.
**Status:** Open

### Gap 7: Package vs Pattern

**Question:** Is this a concrete npm package (`@effect-native/homeostatic`) or a documented pattern that applications implement?
**Context:** Affects whether we're specifying an API or a conceptual framework.
**Status:** Open

### Gap 8: Name

**Question:** What should this be called? Options: homeostatic, reconciler, rules-engine, invariants, etc.
**Context:** Name affects how users discover and understand the purpose.
**Status:** Open

## Resolved Gaps

(none yet)
