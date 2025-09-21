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

# Hypothesis Review

- **Invalidated:** Enforcing a single node identity strategy across all MiniDom implementations is required. React reconciler host configs prove backends can manage identity independently (opaque handles, IDs, object refs) so long as they satisfy a minimal comparison/lookup contract. MiniDom can follow the same pattern by defining capability hooks instead of mandating one approach.
- **Invalidated:** Modern `ParentNode`/`ChildNode` helpers are insufficient for reconciliation. The combination of `before`, `after`, `append`, `replaceChildren`, and `replaceWith` covers all relative insertions (`insertBefore` === `reference.before(newNode)`), so lower-level primitives add redundancy without additional capability.
- **Invalidated:** Mandatory namespace awareness adds needless overhead. Supporting HTML, SVG, MathML, and custom vocabularies requires namespaces in the core; omitting them makes mixed-content documents impossible. The cost is a nullable string per node—trivial compared to interoperability gains.
- **Invalidated:** Returning `Effect.Effect` from every MiniDom operation imposes latency. Implementations can still return `Effect.succeed` / `Effect.sync` for synchronous work; async backends get a first-class path without forcing Promises. The contract adds composability rather than overhead.
- **Invalidated:** Separating MiniDom (core) and MiniDomX (schema/registry) fragments DX. Layered design mirrors standard DOM vs. validation tooling, letting lightweight consumers skip the schema DSL while power users compose it. Collapsing them would force everyone to pay the cost of advanced features.
- **Invalidated:** `AttributeBag` obscures typing. The bag captures dynamic namespace-aware attributes while higher layers (MiniDomX schemas) provide typed views and validation. Replacing the bag with static structs would break extensibility and custom attribute scenarios.
- **Invalidated:** Building a bespoke schema DSL duplicates existing standards. Our DSL is Effect Schema–based and can export Standard Schema v1, enabling interop while keeping zero extra runtime deps. Importing Relax NG (or similar) directly would add heavy tooling and still require bindings into Effect.
- **Invalidated:** Only offering optional adapters leaves teams without a dependable runtime. We plan to ship first-party layers (`HappyMiniDom`, `WindowMiniDom`) that cover Node and browser contexts while allowing installations to omit them when unnecessary; this balances batteries-included defaults with optional peer deps.
- **Invalidated:** A universal React reconciler host config cannot exist. The host config can be parameterized over a MiniDom adapter interface (createNode, appendChild, commitUpdate). React already allows host configs to delegate to backend-provided handles, so we can supply a generic host driven by MiniDom capabilities.
- **Invalidated:** One registry/schema DSL cannot cover heterogeneous storage backends. Structural constraints stay consistent across backends; persistence-specific metadata can attach via optional extensions (e.g., SQL column hints) without forking the DSL, preserving portability.
- **Invalidated:** Composing multiple MiniDom implementations in a tree is untenable. By introducing explicit delegation boundaries (akin to React portals or shadow roots) and routing mutations through a composition layer, we can keep cross-provider ownership clear and maintain validation integrity.
- **Invalidated:** Aligning browser DOM, jsdom, happy-dom, SQL, KV, and in-memory layers under one contract inevitably leads to semantic drift. The shared Effect-based contract plus optional capability flags keeps semantics aligned while allowing implementations to opt into advanced features; narrowing scope would undermine the multi-backend goal.
