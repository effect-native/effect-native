# MiniDom Hypothesis Ledger (Skeptic Locked)

> **Objective**: enumerate every working assumption as a falsifiable hypothesis. Default belief is "false" until a documented disproof attempt survives.

## Anti-Bias & Lock Protocol
1. **Invert the belief**: write each assumption as a hypothesis we expect to disprove.
2. **Design the disproof first**: before implementation begins, record the experiment or proof-of-concept aimed at breaking the hypothesis.
3. **Assign a Skeptic**: every hypothesis has an `Assignee` responsible for trying to invalidate it; no one may self-assign to confirm their own proposal.
4. **Evidence before status**: the `Status` must remain `Locked` until a reproducible artifact (test, benchmark, design note) exists in `experiments/minidom/` and is referenced in `Evidence`.
5. **Two-person rule**: promotion from `Locked` to any other state requires sign-off from a different engineer than the proposer (record in Evidence).
6. **Regression safety**: if evidence grows stale (backend change, new capability), revert the status to `Locked` and schedule a new disproof.
7. **No positive framing**: even if temporary acceptance is needed, record it as `Constrained` with a review date.

_Status values_: `Locked` (default, needs invalidation), `Invalidated` (disproof succeeded), `Constrained` (survived attempt; revisit by review date).

## Hypothesis Table

| ID | Hypothesis (to invalidate) | Status | Disproof Plan | Assignee | Evidence / Notes |
|----|----------------------------|--------|---------------|----------|------------------|
| H1 | Capability-based node handles suffice for every backend; no global ID registry is required. | Locked | Prototype cross-process + remote serialization scenario; attempt to break handle comparison/serialization contract. | TBD |  |
| H2 | A unified `MiniDom.Composite` router can safely mix providers without unforeseen mutation leaks. | Locked | Begin with `experiments/minidom/composite-leak-sim.ts` exercising local + remote + SQL mutations under adversarial scenarios. | @zoe |  |
| H3 | Reusing the Effect Reactivity service covers all observation use cases; no bespoke channel is necessary. | Locked | Simulate large fan-out, high-frequency updates, and network partitions; measure latency vs. domain requirements. | TBD |  |
| H4 | The `MiniDom.Sync` capability fully captures synchronous affordances needed by hosts. | Locked | Stress-test adapters that expose partially sync operations; attempt operations requiring finer granularity. | TBD |  |
| H5 | Tagged `MiniDomError` variants provide enough diagnostics for all adapters (browser, SQL, KV, etc.). | Locked | Inject backend-specific failures; confirm taxonomy distinguishes root causes without custom exceptions. | TBD |  |
| H6 | AttributeBag snapshot + effectful service model satisfies both eager and lazy attribute access patterns. | Locked | Implement streaming attribute source (e.g., remote KV) and attempt to read/modify attributes under load. | TBD |  |
| H7 | Registry `extensions` metadata can remain type-safe while accommodating divergent persistence needs. | Locked | Extend registry with conflicting metadata requirements (SQL vs. KV) and run type-level + runtime checks. | TBD |  |
| H8 | Canonical React host adapter can support every MiniDom adapter, including future async-only backends, via Suspense. | Locked | Prototype `experiments/minidom/react-host-concurrency.ts` with synthetic async-only adapter plus React transitions/Suspense coverage. | @harry |  |
| H9 | Optional adapters (HappyMiniDom, WindowMiniDom, SQL, KV) plus capability descriptors eliminate need for a "default" runtime. | Locked | Run onboarding study without default runtime; evaluate friction vs. providing bundled implementation. | TBD |  |
| H10 | Shared Effect-based API (Effect.Effect return values) imposes no unacceptable latency overhead for synchronous adapters. | Locked | Benchmark tight loops using `Effect.sync` wrappers vs. direct imperative APIs. | TBD |  |
| H11 | Composition validation can occur per-provider with aggregated reports; a central validator is unnecessary. | Locked | Force cross-provider schema violations and verify aggregated validation surfaces all errors. | TBD |  |
| H12 | Capability descriptors are sufficient for downstream tooling; no hidden adapter-specific knowledge is required. | Locked | Kick off `experiments/minidom/capability-tooling-spike.ts` building CLI + host wiring from descriptors alone. | @mira |  |
| H13 | MiniDom.Events streams are adequate for React-induced render cycles; no extra buffering/queuing layer is needed. | Locked | Stress React integration with high-frequency updates; check for dropped frames or buffer overruns. | TBD |  |
| H14 | `withTransaction` abstraction can express transactional semantics for all storage backends we target. | Locked | Model backend requiring multi-phase commit or snapshot isolation; verify abstraction can express it. | TBD |  |
| H15 | Effect Schema-based registries can encode all structural rules (order, multiplicity, transparent content) needed for target vocabularies. | Locked | Model complex HTML/SVG blending with transparent content; attempt to encode; note any gaps. | TBD |  |
| H16 | The layered package structure (core, schema, events, composite, host) remains maintainable as adapters grow. | Locked | Simulate growth to N=6 adapters; evaluate dependency graph complexity and build times. | TBD |  |
| H17 | Standardized `layer`/`make` helpers are enough for DI; no additional configuration DSL is required. | Locked | Onboard a new adapter with complex dependencies; check for boilerplate or missing affordances. | TBD |  |
| H18 | Reusing @effect/experimental Reactivity introduces no stability or versioning risks for the published package. | Locked | Audit Reactivity API stability, version drift, and upstream ownership; plan fallback if API changes. | TBD |  |
| H19 | Single React host adapter will track future React releases without forked variants. | Locked | Review React roadmap; ensure host adapter abstraction can adapt to potential API shifts (e.g., partial hydration). | TBD |  |
| H20 | Documentation requirements (JSDoc @example, docgen) are sufficient to prevent misuse without additional guides. | Locked | Conduct documentation review with fresh user; observe if misuse occurs despite docgen coverage. | TBD |  |
| H21 | Capability detection can be implemented without runtime reflection, keeping tree-shaking intact. | Locked | Prototype capability discovery in bundler scenario; ensure no extra imports degrade tree-shaking. | TBD |  |
| H22 | Hybrid MiniDom trees do not require eventual consistency resolution beyond provider-level enforcement. | Locked | Simulate asynchronous remote updates conflicting with local state; verify composite router behavior. | TBD |  |
| H23 | Registry export to Standard Schema v1 plus extensions suffices for downstream tooling (docs, validators). | Locked | Attempt to integrate with third-party validator requiring extra metadata; note gaps. | TBD |  |
| H24 | Phase 4 workstreams reference only existing FR/SC identifiers; no numbering drift is introduced. | Constrained (review 2025-06) | Compare `plan.md` references (e.g., `FR1.17`) against `.specs/minidom/requirements.md`; update plan/requirements to restore traceability. | @zoe | E15 audit (`experiments/minidom/plan-traceability-audit.md`, 2025-03-10) confirms plan references valid identifiers (`FR1.1`, `FR1.9`, `DR4.4`, `SC7.1`–`SC7.13`). Re-run if requirements numbering changes. |

_Add new hypotheses before committing to new conclusions. Update `Assignee` and `Evidence` as experiments run._

## Experiments Backlog
- E10: React host concurrency demo (targets H8, H19).
- E11: Cross-provider transaction simulation (targets H2, H22).
- E12: Capability-only tooling spike (targets H12, H21).
- E13: Reactivity stability audit (targets H18).
- E14: Registry extensions schema validation comparison (targets H7, H23).
- [x] E15: Plan traceability audit ensuring FR/SC alignment (targets H24) — Completed 2025-03-10 by @zoe (see `experiments/minidom/plan-traceability-audit.md`).
