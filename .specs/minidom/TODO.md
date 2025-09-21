# MiniDom Assumption Ledger

> Track only the hypotheses that remain unresolved. Treat each as “false until disproved,” and tie every conclusion to an explicit invalidation experiment.

## Anti-Bias Protocol
1. State the assumption in the negative and record it as a hypothesis before acting on it.
2. Design a disproof experiment (or proof-of-concept) that would break the hypothesis.
3. Run the experiment, capture the evidence, and update status. If the evidence goes stale, reset the hypothesis to "Needs Invalidation."

_Status codes:_ `Needs Invalidation` (experiment outstanding), `In Progress` (experiment running), `Constrained` (survived, revisit on new context), `Invalidated` (assumption rejected).

## Open Hypotheses

| ID | Hypothesis (to invalidate) | Status | Disproof Plan | Evidence / Notes |
|----|----------------------------|--------|---------------|------------------|
| H24 | React host integration needs no additional scheduling primitives beyond capability checks. | Needs Invalidation | Build a MiniDom-powered React host config demo covering Suspense, transitions, and streaming SSR; verify no extra scheduler hooks are required. | Pending. |
| H25 | Composite MiniDom transactions never require coordination across providers. | Needs Invalidation | Simulate a mutation that spans local + SQL MiniDom providers and observe whether two-phase commit / rollback orchestration is needed. | Pending. |
| H26 | Event payloads can remain provider-specific without normalization. | Needs Invalidation | Aggregate change events from browser, SQL, and remote adapters into one consumer and confirm consumers can act without schema alignment. | Pending. |
| H27 | Runtime capability detection is sufficient; static typing offers no extra safety. | Needs Invalidation | Prototype a typed capability helper and compare developer experience and failure modes against runtime-only detection. | Pending. |
| H28 | Registry `extensions` metadata requires no schema validation. | Needs Invalidation | Define and enforce an Effect Schema for extensions; measure whether the validation catches integration defects that the free-form approach misses. | Pending. |

## Experiments Backlog
- E10: React host concurrency demo (targets H24).
- E11: Cross-provider transaction simulation (targets H25).
- E12: Multi-adapter event normalization spike (targets H26).
- E13: Typed capability helper prototype (targets H27).
- E14: Registry extensions schema validation comparison (targets H28).

_Add new hypotheses immediately whenever fresh assumptions appear._
