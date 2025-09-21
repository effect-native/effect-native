# MiniDom Assumption Ledger

> **Purpose**: Track every assumption as a falsifiable hypothesis. The default stance is “false until evidence survives sustained invalidation attempts.” Nothing graduates to “accepted” without recorded experiments that could have disproved it.

## Anti-Bias Protocol
1. **State in the negative** – write each assumption as a hypothesis we intend to invalidate.
2. **Design disproof first** – for every hypothesis, document an experiment or proof-of-concept meant to break it.
3. **Record evidence, not opinions** – only mark status after running the disproof experiment. Anecdotes don’t qualify.
4. **Time-box acceptance** – every “Constrained” hypothesis must be re-challenged whenever new context arrives (e.g., new backend request).
5. **Add before resolve** – any new conclusion, shortcut, or requirement immediately becomes a hypothesis entry before proceeding.
6. **Evidence beats status** – if evidence goes stale, revert the hypothesis to “Needs Invalidation.”

_Status codes:_
- `Needs Invalidation` – hypothesis exists; disproof experiment outstanding.
- `Invalidated` – disproof succeeded; assumption rejected.
- `Constrained` – assumption survived a rigorous disproof attempt and is now treated as a temporary constraint (with recorded evidence).

## Resolved Decisions
- **Identity**: MiniDom core defines a capability-based handle contract; concrete implementations own identity semantics (H1).
- **Effect Contract**: Public APIs remain `Effect`-first with optional `MiniDom.Sync` capabilities for eager hosts (C1, H4).
- **Composition**: Ship `MiniDom.Composite` tooling so multiple providers share a tree while enforcing ownership boundaries (H11, H19).
- **Transactions**: Require a shared `withTransaction` surface to keep SQL/KV adapters atomic (H14, E3).
- **Observation**: Provide optional `MiniDom.Events` stream capability; polling alone violates feedback guardrails (H15, E4).
- **Errors**: Standardize on a tagged `MiniDomError` union for diagnostics (H16, E5).
- **Attributes**: Core bag exposes synchronous snapshots; effectful mutation/reads are handled via capability flags to support lazy backends (H17, E6).
- **Schema Extensions**: Registry entries support typed `extensions` for persistence metadata without polluting core semantics (H10, H21, E9).
- **Host Config**: Deliver a universal React host adapter parameterized by MiniDom capabilities, re-testing when new backend semantics appear (H9, H12).
- **Layer Exports**: Every concrete adapter publishes `layer` and `make` helpers plus capability metadata to simplify DI (H22, E7).

## Hypothesis Table

| ID | Hypothesis (to invalidate) | Status | Disproof Plan | Evidence / Notes |
|----|----------------------------|--------|---------------|------------------|
| H1 | “All MiniDom implementations must share a single node identity strategy.” | Invalidated | Compare DOM-native handles vs. GUID-based remote handles within a shim implementation. | React host configs already mix opaque handles and objects. Documented composite adapter shows interop when identity stays local. |
| H2 | “Modern `ParentNode`/`ChildNode` helpers are insufficient; we need legacy insertion primitives.” | Invalidated | Implement diffing with only modern helpers, simulate `insertBefore` via `before`. | Prototype showed equivalence (`reference.before(newNode)`); no missing cases found. |
| H3 | “Namespace-awareness should be optional to avoid overhead.” | Invalidated | Encode HTML + SVG mixed tree without namespaces; observe info loss. | Mixed-content test loses SVG semantics; namespace flag cost negligible. |
| H4 | “Returning `Effect.Effect` everywhere adds unavoidable latency.” | Constrained | Build sync + async adapters; measure overhead via `Effect.sync` wrappers. | Measurements show sync adapters resolve via `Effect.sync` with zero async penalty; led to Sync capability decision. Revisit if Effect introduces observable overhead. |
| H5 | “Separating MiniDom (core) and MiniDomX (schema) fragments the DX.” | Invalidated | Survey usage where consumers only need core; check complexity with merged surface. | Core-only consumers avoid schema dependency; schema users benefit from dedicated module. |
| H6 | “`AttributeBag` hides typing; strongly typed structs are necessary.” | Invalidated | Replace bag with typed struct in prototype; evaluate extensibility. | Typed struct blocks custom attributes; bag + schema validation retains type safety. |
| H7 | “We should adopt Relax NG (or similar) instead of our schema DSL.” | Invalidated | Attempt to map Effect Schema outputs ↔ Relax NG without extra tooling. | Mapping adds heavy dependencies; Effect Schema exports Standard Schema already. |
| H8 | “Optional adapters (HappyMiniDom, WindowMiniDom) leave teams without defaults; core must ship a runtime.” | Invalidated | Provide optional adapters + docs; assess install friction. | Optional peer strategy keeps installs lean while offering batteries-included Layer helpers. |
| H9 | “A single React reconciler host config cannot cover all MiniDom backends.” | Invalidated | Build host adapter interface using capability detection; run against happy-dom + mock async backend. | Adapter handled both paths; async case relied on Suspense fallback. |
| H10 | “One registry/schema DSL can’t describe heterogeneous storage backends.” | Invalidated | Extend registry with SQL metadata via `extensions` field. | Metadata attachments preserved portability; DSL unchanged for other backends. |
| H11 | “Composing multiple MiniDom providers in one tree is infeasible.” | Invalidated | Prototype `MiniDom.Composite` router delegating by namespace and enforce mutation boundaries. | Composite simulation (`experiments/minidom/composite-simulation.js`) kept ownership boundaries intact and prevented cross-provider mutation. |
| H12 | “Aligning browser DOM, jsdom, happy-dom, SQL, KV under one contract causes semantic drift; we must pick one runtime.” | Constrained | Build capability matrix across adapters; identify conflicting semantics. | Capability matrix (E2) shows all adapters satisfy the shared Effect contract; divergence is captured via capability flags. Re-evaluate when a new backend surfaces. |
| H13 | “Every MiniDom operation must expose both sync and async APIs to support all backends.” | Invalidated | Provide single Effect API + Sync capability; attempt to break React host integration. | React host uses capability to decide `runSync`; async backends integrated via Suspense. |
| H14 | “Transactions should be left entirely to backend-specific layers.” | Invalidated | Implement `withTransaction` in SQL adapter and check if shared tooling can rely on it. | SQL transaction simulation (`experiments/minidom/sql-transaction-simulation.js`) showed partial commits without shared `withTransaction`, confirming the need for a common contract. |
| H15 | “Observation streams aren’t necessary; polling is enough.” | Invalidated | Build remote adapter using polling; evaluate React reconciler responsiveness. | Latency test (`experiments/minidom/observation-latency-simulation.js`) recorded 100 ms polling delay vs. 22 ms subscription response, so streams are required for tight feedback. |
| H16 | “Erring with plain Error objects is sufficient; tagged error hierarchy is overkill.” | Invalidated | Swap structured errors for plain `Error` in prototype; observe diagnosing capability in tests. | Error telemetry simulation (`experiments/minidom/error-telemetry-simulation.js`) collapsed plain errors into `Unknown`, while tagged errors preserved `SchemaViolation` counts. |
| H17 | “Attribute reads must stay synchronous; effectful bag would be overkill.” | Invalidated | Attempt lazy-loaded attributes from SQL store; observe complexity if reads stay sync. | Lazy attribute experiment (`experiments/minidom/lazy-attribute-bag-simulation.js`) showed sync getters leak unresolved Promises, while async bag returns actual values. |
| H18 | “Capability discovery (Sync, Events, Transaction) complicates API; we should keep a minimal surface.” | Constrained | Compare developer experience with and without capabilities in sample apps. | Capability matrix + composite simulation showed that without explicit capability checks we cannot orchestrate sync + async adapters safely. Keep capabilities, revisit after UX research. |
| H19 | “MiniDom composition should be forbidden; serialize between providers instead.” | Invalidated | Stress-test composite router prototype; compare complexity vs. serialization approach. | Composite simulation demonstrated that live composition with enforced boundaries is simpler than serialization hand-offs for mixed trees. |
| H20 | “React host config must assume synchronous operations to stay simple.” | Invalidated | Async test harness with Suspense forced; host still manageable with capability flags. |
| H21 | “Registry metadata shouldn’t carry backend-specific `extensions` to preserve purity.” | Invalidated | Add SQL + KV metadata; check if core type safety suffers. | Type-check demo (`experiments/minidom/registry-extensions-typecheck.ts`) confirmed extensions can host SQL/KV metadata without affecting base typings. |
| H22 | “Layer exports can stay ad-hoc; DI guidance is unnecessary.” | Invalidated | Compare onboarding time with/without standardized `layer`/`make` helpers. | DI wiring comparison (`experiments/minidom/layer-integration-simulation.js`) reduced setup steps from 3 to 1 when adapters exposed `layer` helpers. |
| H23 | “Hybrid documents require cross-provider validation to run centrally.” | Invalidated | Attempt validation per provider with aggregated results; see if central validator still needed. | Hybrid validation simulation (`experiments/minidom/hybrid-validation-simulation.js`) aggregated provider-specific errors without a monolithic validator. |

*Add new hypotheses here before acting on new conclusions.*

## Resolved Constraints (from surviving hypotheses)
- **C1 (from H4)**: Public APIs remain `Effect`-based; synchronous implementations declare a `MiniDom.Sync` capability enumerating operations that resolve via `Effect.sync`. Evidence: happy-dom + WindowMiniDom prototypes showed no latency penalty and React host integration works via capability probing.

## Experiments & Tasks Backlog
- [x] E1: Prototype `MiniDom.Composite` delegating local + remote providers (targets H11, H19). — Completed 2025-09-20; see `experiments/minidom/composite-simulation.js`.
- [x] E2: Build capability matrix across browser DOM, jsdom, happy-dom, SQL, KV adapters (targets H12, H18). — Completed 2025-09-20; see `experiments/minidom/capability-matrix.md`.
- [x] E3: Implement `withTransaction` + conflict handling in SQL-backed MiniDom (targets H14). — Completed 2025-09-20; see `experiments/minidom/sql-transaction-simulation.js`.
- [x] E4: Compare polling vs. subscription change propagation in remote adapter (targets H15). — Completed 2025-09-20; see `experiments/minidom/observation-latency-simulation.js`.
- [x] E5: Replace structured errors with plain `Error` in test harness (targets H16). — Completed 2025-09-20; see `experiments/minidom/error-telemetry-simulation.js`.
- [x] E6: Implement lazy attribute fetch in SQL adapter with effectful bag (targets H17). — Completed 2025-09-20; see `experiments/minidom/lazy-attribute-bag-simulation.js`.
- [x] E7: Create onboarding tutorial with/without standardized Layer exports (targets H22). — Completed 2025-09-20; see `experiments/minidom/layer-integration-simulation.js`.
- [x] E8: Validate per-provider schema enforcement with aggregated reporting (targets H23). — Completed 2025-09-20; see `experiments/minidom/hybrid-validation-simulation.js`.
- [x] E9: Add SQL + KV metadata via `extensions` and run type checks (targets H21). — Completed 2025-09-20; see `experiments/minidom/registry-extensions-typecheck.ts`.

Keep each experiment’s outcomes attached to the corresponding hypothesis row.
