# MiniDom Plan

## Five-Phase Implementation Checklist
- [x] Phase 1 — Instructions (documented)
- [x] Phase 2 — Requirements (complete)
- [x] Phase 3 — Design (complete)
- [x] Phase 4 — Plan (this document)
- [ ] Phase 5 — Implementation & Validation (in progress: AttributeBag service + Sync capability)

## Task Hierarchies

### 1. Package Scaffolding & Layer Exports
- [x] Create `packages-native/minidom` structure (core, schema, events, composite, host, adapters)
- [x] Implement `MiniDom.Handle`, capability descriptors, and tagged `MiniDomError`
- [x] Provide baseline `layer`/`make` helpers for HappyMiniDom and WindowMiniDom
- [x] Stub additional adapters (sql, kv) with capability metadata placeholders

### 2. Core API & Attribute Handling
- [x] Implement namespace-aware node interfaces (`FR1.1`)
- [x] Ship AttributeBag view/service split with Effect-only operations (`FR1.9`, `DR4.4`)
- [x] Introduce `MiniDom.Sync` capability wiring with unit coverage for synchronous runners (`FR1.9`, `SC7.6`)
- [x] Extend tests to cover async capability detection via synthetic delayed adapters
- [x] Document JSDoc @examples for core APIs

### 3. Schema DSL & Registry Extensions
- [x] Port MiniDomX DSL, ensure Effect Schema integration, and typed `extensions` (complete — `Schema.content` supports choice/optional/repetition/interleave/any/empty; validation covers multiplicity and order semantics; Effect Schema integration verified via `schema-validation.test.ts` [`FR1.3`, `FR1.14`, `SC7.3`, `SC7.11`])
- [x] Create sample registries demonstrating metadata for SQL/KV backends (complete — `Schema.samples` exposes SQL/KV fixtures validated via docs/tests on 2025-09-21 [`FR1.14`, `SC7.11`])
- [x] Provide Standard Schema export utilities
  (complete — `Schema.toStandardSchemaV1` plus README coverage as of 2025-09-21 [`FR1.3`, `FR1.4`, `FR1.14`, `SC7.3`])

### 4. Observation & Reactivity Integration
- [x] Wrap @effect/experimental Reactivity service (`MiniDom.Events`)
- [x] Implement mutation helpers calling `Reactivity.mutation`
- [x] Add observation tests comparing stream vs polling latency

### 5. Composition & Transactions
- [x] Implement `MiniDom.Composite` router enforcing ownership boundaries (Iteration 24 — read-only enforcement via `packages-native/minidom/test/composite-boundary.test.ts`, evidence in `experiments/minidom/log-20250921-2052.md`)
- [x] Provide `withTransaction` API and tagged conflict errors (Iterations 25–39 — core `Transaction` capability, composite delegation, AttributeBag atomic semantics, shared helper coverage, hybrid transaction enforcement, cross-adapter read validation, async remote rollback, refresh conflict detection, refresh recovery, hybrid tree verification, and adversarial refresh reporting via `packages-native/minidom/test/transaction-conflict.test.ts`, `transaction-composite.test.ts`, `transaction-attribute-bag.test.ts`, `transaction-with-transaction.test.ts`, `transaction-hybrid-composite.test.ts`, `transaction-hybrid-boundary.test.ts`, `transaction-hybrid-conflict.test.ts`, `transaction-hybrid-reload.test.ts`, `transaction-hybrid-refresh-conflict.test.ts`, `transaction-hybrid-refresh-recover.test.ts`, `transaction-hybrid-tree.test.ts`, `transaction-hybrid-adversarial.test.ts`; evidence in `experiments/minidom/log-20250921-2052.md`)
- [x] Create hybrid tree tests combining local, happy-dom, and mock remote adapters (Iteration 38 evidence: `packages-native/minidom/test/transaction-hybrid-tree.test.ts` plus adversarial refresh coverage; see `experiments/minidom/log-20250921-2052.md`)

### 6. React Host Adapter
- [ ] Build canonical host config mapping capabilities to React reconciler hooks
- [ ] Support Suspense/transition scenarios for async adapters
- [ ] Add tests for sync (HappyMiniDom) and async (mock remote) adapters

### 7. Documentation & Tooling
- [ ] Ensure JSDoc coverage with docgen validation
- [ ] Generate capability matrix documentation and onboarding guides
- [ ] Update README/package docs with adapter usage examples

## Validation Checkpoints
- `nix develop --command pnpm lint --fix packages-native/minidom/**/*.ts`
- `nix develop --command pnpm docgen`
- `nix develop --command pnpm check`
- `nix develop --command pnpm test packages-native/minidom`
- `nix develop --command pnpm build`

## Risk Mitigation
- Hypotheses H2/H8/H12 actively tracked; experiments under `/experiments/minidom` gate composite leaks, React concurrency, and capability-only tooling.
- Introduce feature flags for experimental adapters (SQL/KV) until transaction semantics proven.
- Maintain compatibility shims with Reactivity service version; fallback to local event bus if API shifts.
- Document capability descriptors thoroughly to avoid hidden assumptions by downstream tooling.

## Success Criteria Validation
- Map unit/integration tests directly to SC7.1–SC7.13 checklist.
- Before final integration, run capability matrix and composite tests to demonstrate coverage.
- Capture benchmark outputs (Effect sync vs imperative, observation latency) for regression.

## Progress Tracking
| Task | Owner | Status |
|------|-------|--------|
| Package scaffolding & layers | @codex | Complete — Core, schema, composite, host, adapters, and events modules exported via `packages-native/minidom/src/index.ts`; HappyMiniDom/WindowMiniDom helpers (`happy-mini-dom.test.ts`), stub SQL/KV adapters with capability metadata (`adapter-stubs.test.ts`). |
| Core API & attributes | @codex | In progress — Node interfaces shipped with `packages-native/minidom/src/core/Nodes.ts`; AttributeBag sync/async/loader flows validated (Iterations 14–19, see `experiments/minidom/log-20250921-1153.md#L75`, `#L126`) |
| Schema DSL & extensions | @codex | Complete — MiniDomX DSL supports choice/interleave/multiplicity/any/empty; Effect Schema bridge and typed extensions exercised via `packages-native/minidom/test/schema-validation.test.ts`. |
| Observation integration | @codex | Complete — `MiniDom.Events` wraps Reactivity service with query/mutation helpers; latency tests compare mailbox invalidation vs polling (`packages-native/minidom/src/events/index.ts`, `packages-native/minidom/test/events.test.ts`). |
| Composition & transactions | @codex | In progress — Ownership guard (Iteration 24), Transaction capability + composite delegation (Iterations 25–33), shared helper coverage (`transaction-with-transaction.test.ts`, Iteration 34), hybrid adapter enforcement (`transaction-hybrid-composite.test.ts`, Iteration 35), cross-adapter read validation (`transaction-hybrid-boundary.test.ts`, Iteration 36), async remote rollback coverage (`transaction-hybrid-conflict.test.ts`, Iteration 37), and refresh conflict detection (`transaction-hybrid-reload.test.ts`, Iteration 38; see `experiments/minidom/log-20250921-2052.md`); adapter-backed transactional integrations still pending |
| React host adapter | TBD | Not started |
| Documentation & tooling | @codex | In progress — README covers `Schema.samples` + `Schema.toStandardSchemaV1` and Effect.gen workflow (`packages-native/minidom/README.md`) |

Update the table after each milestone, referencing commit hashes and experiment evidence.
