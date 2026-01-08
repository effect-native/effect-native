# Phase 3 Design Gaps Index

Generated: 2026-01-07

## Summary

| Lens | Count | ID Range |
|------|-------|----------|
| Data Model | 5 | 101-105 |
| API Surface | 6 | 201-206 |
| Service Architecture | 6 | 301-306 |
| Error Strategy | 6 | 401-406 |
| State Management | 5 | 501-505 |
| Effect Patterns | 6 | 601-606 |
| **Total** | **34** | |

---

## Data Model Lens (101-105)

| ID | Title | Blocked By |
|----|-------|------------|
| gap-101 | Gap Identity Field Declaration Mechanism | - |
| gap-102 | Type Parameter Threading Through Rule/Resolution | - |
| gap-103 | Internal Gap State vs User-Facing Gap Type | - |
| gap-104 | Work Order Schema and Extensibility | - |
| gap-105 | Error Type Hierarchy and Tagged Error Design | - |

---

## API Surface Lens (201-206)

| ID | Title | Blocked By |
|----|-------|------------|
| gap-201 | Module Organization and Entry Point Structure | - |
| gap-202 | Gap Type Definition Mechanism | - |
| gap-203 | Engine Configuration and Builder API | - |
| gap-204 | Rule Context Type and Service Dependencies | - |
| gap-205 | Reconciliation Result Type and Access Patterns | - |
| gap-206 | WorkOrderSink Service Interface Design | - |

---

## Service Architecture Lens (301-306)

| ID | Title | Blocked By |
|----|-------|------------|
| gap-301 | Engine Service Interface Granularity | - |
| gap-302 | Rule and Resolution Registration Mechanism | - |
| gap-303 | Rule Context Service Dependencies | - |
| gap-304 | Default vs Test Layer Composition Strategy | - |
| gap-305 | WorkOrderSink Service Contract and Error Handling | - |
| gap-306 | Service Lifecycle and Scoping | - |

---

## Error Strategy Lens (401-406)

| ID | Title | Blocked By |
|----|-------|------------|
| gap-401 | Error Type Taxonomy | - |
| gap-402 | Error Channel vs Defect Boundary | - |
| gap-403 | Error Propagation in the Reconciliation Loop | - |
| gap-404 | Recovery Strategy for Escalation Failures | - |
| gap-405 | Timeout Implementation Pattern | - |
| gap-406 | Error Context and Traceability | - |

---

## State Management Lens (501-505)

| ID | Title | Blocked By |
|----|-------|------------|
| gap-501 | Loop State Structure and Ownership | - |
| gap-502 | Gap Status Lifecycle and Transition Rules | - |
| gap-503 | Inter-Iteration State Propagation | - |
| gap-504 | Immutability Guarantees for Gap Data | - |
| gap-505 | State Observation and Progress Reporting | - |

---

## Effect Patterns Lens (601-606)

| ID | Title | Blocked By |
|----|-------|------------|
| gap-601 | Service Definition Pattern for Engine | - |
| gap-602 | Data.TaggedClass vs Schema.TaggedClass for Gaps | gap-101 |
| gap-603 | Rule and Resolution Function Signatures | - |
| gap-604 | Layer Composition Strategy | gap-601 |
| gap-605 | Tagged Error Hierarchy | - |
| gap-606 | Module Organization Following effect-native | - |

---

## Dependency Graph

```
gap-101 ─────────────────────────────────┐
                                         │
                                         ▼
                                    gap-602 (Data vs Schema for Gaps)

gap-601 ─────────────────────────────────┐
                                         │
                                         ▼
                                    gap-604 (Layer Composition Strategy)
```

Only 2 cross-lens dependencies identified.

---

## Workable Gaps (No Blockers)

The following 32 gaps can be worked immediately:

**Data Model**: gap-101, gap-102, gap-103, gap-104, gap-105  
**API Surface**: gap-201, gap-202, gap-203, gap-204, gap-205, gap-206  
**Service Architecture**: gap-301, gap-302, gap-303, gap-304, gap-305, gap-306  
**Error Strategy**: gap-401, gap-402, gap-403, gap-404, gap-405, gap-406  
**State Management**: gap-501, gap-502, gap-503, gap-504, gap-505  
**Effect Patterns**: gap-601, gap-603, gap-605, gap-606

---

## Cross-Cutting Themes

Several gaps address the same underlying concern from different lenses:

### Identity & Serialization
- gap-101 (Data): Identity field declaration
- gap-602 (Effect): Data vs Schema choice

### Error Handling
- gap-105 (Data): Error type hierarchy
- gap-401 (Error): Error taxonomy
- gap-605 (Effect): Tagged error hierarchy

### Service Structure
- gap-301 (Service): Engine granularity
- gap-601 (Effect): Service definition pattern

### Rule Dependencies
- gap-204 (API): Rule context type
- gap-303 (Service): Rule context dependencies

### Loop State
- gap-501 (State): Loop state structure
- gap-503 (State): Inter-iteration propagation

These clusters should be resolved together to ensure consistency.
