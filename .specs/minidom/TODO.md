# MiniDom TODO & Decision Log

## Decisions to Resolve
- **Node Identity Model**: validated that forcing a single identity strategy (explicit `NodeId` tokens vs. mutable object references) is a false dichotomy. Inspired by `react-reconciler` host configs, each MiniDom implementation can own its identity semantics as long as it can round-trip node handles through the shared API. Follow-up: specify the minimal capabilities the core contract expects (e.g., ability to compare node handles, serialize when needed) without mandating IDs or mutability globally.
- **MiniDom Composition Strategy**: define how multiple MiniDom implementations compose (e.g., router/federation layer that delegates subtrees). Clarify constraints on cross-provider children and mutation routing.
- **Effect Contract Granularity**: confirm which operations must stay synchronous for React host compatibility and which may be asynchronous Effects. Decide whether to surface optional `SyncCapabilities` for eager hosts.
- **Transactional Semantics**: specify whether MiniDom must support batched/transactional edits (esp. for SQL/KV backends) and how conflicts/rollbacks surface through `Effect`.
- **Schema DSL Extensions**: determine how persistence metadata (table mapping, indexes) attaches to the registry DSL for SQL/KV backends.
- **Attribute Access Pattern**: decide if `AttributeBag` remains synchronous or evolves into an effectful API for lazy/backed stores.
- **Error Taxonomy**: define a `MiniDomError` hierarchy (e.g., `ValidationError`, `TransportError`, `ConflictError`) to unify local and remote failure handling.
- **Observation & Subscriptions**: choose whether MiniDom exposes change streams (`Stream`, `PubSub`) for remote sync and React reconciler updates.
- **React Host Config Contract**: outline the canonical mapping between React reconciler host methods and MiniDom APIs, including suspense/async strategies.
- **Layer Composition Guidelines**: document how concrete implementations surface as `Layer` instances (e.g., HappyMiniDom, WindowMiniDom, SqlMiniDom) and how they depend on other services like `SqlClient`.

## Follow-up Tasks
- Update `.specs/minidom/instructions.md` and `requirements.md` once decisions solidify, ensuring traceability.
- Prototype the React host adapter shape to validate synchronous vs. asynchronous assumptions.
- Experiment with a hybrid tree proof-of-concept (local + remote) to test composition requirements.
- Draft a persistence mapping spec for one SQL schema to pressure-test the registry DSL extension.
- Capture testing strategy for optional peer deps (happy-dom, jsdom, browser DOM) within TDD guardrails.

---

# hypothesis

- Node Identity Model decision is a false dichotomy. It is possible to move the responsibility to each concrete layer instead of imposing a single decision across every implementation. Take inspiration from react-reconciler host configuration

attempt to invalidate these hypothesis and update this document .specs/minidom/TODO.md with your findings.
