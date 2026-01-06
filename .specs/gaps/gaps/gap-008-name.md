---
id: gap-008
phase: 1
status: resolved
blocked_by:
  - gap-001
  - gap-004
resolved_date: 2026-01-06
---

# Gap: Name

## Question

What should this be called? Options: homeostatic, reconciler, rules-engine, invariants, etc.

## Context

Name affects how users discover and understand the purpose. Should reflect the core concept.

## Resolution

**Name:** `@effect-native/gaps`

**Rationale:** The core concept is gaps - the delta between desired state and actual state. Rules produce gaps. Resolutions close gaps. The whole system is about managing gaps.

Rename the spec folder from `homeostatic` to `gaps`.
