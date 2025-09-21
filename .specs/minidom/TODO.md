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

- Hypothesis: Enforcing a single node identity strategy across all MiniDom implementations is required to keep interop coherent; allowing per-layer freedom will fracture host behavior.
- Hypothesis: Relying exclusively on modern `ParentNode`/`ChildNode` helpers leaves essential reconciliation scenarios unsupported; we must reintroduce lower-level insertion primitives such as `insertBefore`.
- Hypothesis: Making namespace-awareness mandatory across the core API adds needless overhead; a namespace-agnostic default with opt-in namespaces better serves the dominant workloads.
- Hypothesis: Returning `Effect.Effect` from every MiniDom operation imposes avoidable latency and complexity; synchronous-first APIs with optional effect wrappers would integrate more cleanly with existing hosts.
- Hypothesis: Separating MiniDom and MiniDomX into distinct layers fragments developer experience; a single integrated surface yields clearer ergonomics and adoption.
- Hypothesis: The `AttributeBag` abstraction obscures element-specific typing guarantees; strongly typed attribute structs should replace the bag to ensure correctness.
- Hypothesis: Building a bespoke schema DSL duplicates mature standards; adopting an external schema language (e.g., Relax NG) directly would lower long-term risk.
- Hypothesis: Shipping only optional adapters like `HappyMiniDom` leaves teams without a dependable default runtime; the core package must include an official implementation out of the box.
- Hypothesis: A universal React Reconciler host config cannot exist; each MiniDom backend will demand bespoke host methods to respect its operational semantics.
- Hypothesis: Supporting heterogeneous storage backends through one registry/schema DSL is unrealistic; divergent SQL schemas will force backend-specific modeling that fractures portability.
- Hypothesis: Composing multiple MiniDom implementations within a single document tree is untenable; cross-provider mutation and validation boundaries will collapse under real workloads.
- Hypothesis: Aligning real browser DOM, jsdom, happy-dom, SQL, KV, and in-memory adapters under one contract will yield semantic drift; tightening scope to a single blessed runtime is the only way to ensure predictability.

attempt to invalidate these hypothesis and update this document .specs/minidom/TODO.md with your findings.
