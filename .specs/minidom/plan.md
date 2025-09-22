# MiniDom Plan

## Five-Phase Implementation Checklist
- [x] Phase 1 — Instructions (documented)
- [x] Phase 2 — Requirements (complete)
- [x] Phase 3 — Design (complete)
- [x] Phase 4 — Plan (this document)
- [ ] Phase 5 — Implementation & Validation (in progress: AttributeBag service + Sync capability)

## Task Hierarchies

### 1. Package Scaffolding & Layer Exports
- [ ] Create `packages-native/minidom` structure (core, schema, events, composite, host, adapters)
- [ ] Implement `MiniDom.Handle`, capability descriptors, and tagged `MiniDomError`
- [ ] Provide baseline `layer`/`make` helpers for HappyMiniDom and WindowMiniDom
- [ ] Stub additional adapters (sql, kv) with capability metadata placeholders

### 2. Core API & Attribute Handling
- [x] Implement namespace-aware node interfaces (`FR1.1`)
- [x] Ship AttributeBag view/service split with Effect-only operations (`FR1.9`, `DR4.4`)
- [x] Introduce `MiniDom.Sync` capability wiring with unit coverage for synchronous runners (`FR1.9`, `SC7.6`)
- [x] Extend tests to cover async capability detection via synthetic delayed adapters
- [x] Document JSDoc @examples for core APIs

### 3. Schema DSL & Registry Extensions
- [ ] Port MiniDomX DSL, ensure Effect Schema integration, and typed `extensions` (in progress — attribute/element metadata stored with registries, grouped via `Schema.extensionsByAdapter`, and bridged to Effect Schema via `Schema.toEffectSchema` as of 2025-09-21 [`FR1.3`, `FR1.14`, `SC7.3`, `SC7.11`])
- [x] Create sample registries demonstrating metadata for SQL/KV backends (complete — `Schema.samples` exposes SQL/KV fixtures validated via docs/tests on 2025-09-21 [`FR1.14`, `SC7.11`])
- [x] Provide Standard Schema export utilities
  (complete — `Schema.toStandardSchemaV1` plus README coverage as of 2025-09-21 [`FR1.3`, `FR1.4`, `FR1.14`, `SC7.3`])

### 4. Observation & Reactivity Integration
- [ ] Wrap @effect/experimental Reactivity service (`MiniDom.Events`)
- [ ] Implement mutation helpers calling `Reactivity.mutation`
- [ ] Add observation tests comparing stream vs polling latency

### 5. Composition & Transactions
- [ ] Implement `MiniDom.Composite` router enforcing ownership boundaries
- [ ] Provide `withTransaction` API and tagged conflict errors
- [ ] Create hybrid tree tests combining local, happy-dom, and mock remote adapters

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
| Package scaffolding & layers | TBD | Not started |
| Core API & attributes | @codex | In progress — Node interfaces shipped with `packages-native/minidom/src/core/Nodes.ts`; AttributeBag sync/async/loader flows validated (Iterations 14–19, see `experiments/minidom/log-20250921-1153.md#L75`, `#L126`) |
| Schema DSL & extensions | @codex | In progress — MiniDomX schema helpers with typed `extensions`, adapter grouping, Standard Schema export, and sample registries (`Schema.samples`) (see `packages-native/minidom/src/schema/index.ts`) |
| Observation integration | TBD | Not started |
| Composition & transactions | @codex | In progress — Composite router skeleton + refresh delegation under Iteration 20 (`experiments/minidom/log-20250921-1153.md#L170`) |
| React host adapter | TBD | Not started |
| Documentation & tooling | @codex | In progress — README covers `Schema.samples` + `Schema.toStandardSchemaV1` and Effect.gen workflow (`packages-native/minidom/README.md`) |

Update the table after each milestone, referencing commit hashes and experiment evidence.
