# MiniDom Feature Instructions

## Overview and User Story
As framework maintainers building Effect-native tooling, we need a reusable MiniDom package that offers a browser-agnostic DOM subset plus an extensible schema layer so that teams implementing HTML, SVG, MathML, or custom DSLs can share infrastructure.

## Core Requirements (EARS)
1. [Ubiquitous] MiniDom shall expose namespace-aware TypeScript interfaces for nodes, elements, documents, and fragments that mirror the modern DOM subset outlined in `.specs/minidom/research.md` while remaining environment-agnostic.
2. [Ubiquitous] MiniDom shall separate standard DOM-like primitives from non-standard extensions by delivering a composable "MiniDomX" layer that hosts registries, schema DSL, and validators.
3. [Event-Driven] When defining a custom element (standard or user-defined), the system shall allow authors to declare valid parent/child relationships, required descendants, and attribute constraints using Effect Schema.
4. [Event-Driven] When validating a node tree against a registry, the system shall raise structured, tagged Effect errors if structural, ordering, or attribute requirements are violated.
5. [State-Driven] While using MiniDom APIs to construct or mutate trees, the system shall support modern mutation helpers (`append`, `prepend`, `replaceChildren`, `before`, `after`, `replaceWith`, `remove`) without exposing historical DOM insertion APIs.
6. [Optional] When consumers opt into JSX integration, the system shall provide a factory-compatible node representation and optional code generation hooks to tighten `JSX.IntrinsicElements` typings without adding React as a dependency.
7. [Optional] When the optional `happy-dom` peer dependency is installed, the system shall expose `HappyMiniDom` as a ready-to-use implementation that satisfies the MiniDom interfaces using happy-dom under the hood.
8. [Event-Driven] When provided a `window: Window`, the system shall expose `WindowMiniDom` whose layer constructor produces `Layer.Layer<MiniDom>` and factory constructor yields `Effect.Effect<MiniDom>` bound to that window instance.
9. [State-Driven] Across all core APIs, the system shall surface operations as `Effect.Effect` values so MiniDom implementations may execute synchronously or asynchronously under the hood without ever returning raw Promises, while exposing synchronous paths via a `MiniDom.Sync` capability descriptor.
10. [Event-Driven] When multiple MiniDom implementations collaborate on one document tree, the system shall offer composition tooling that delegates ownership by capability (namespace, handle prefix, etc.) and blocks cross-provider mutations that would violate boundaries.
11. [Event-Driven] When a MiniDom implementation provides transactional storage guarantees, the system shall expose a shared `withTransaction` API that enforces atomic commits and reports conflicts through the tagged error taxonomy.
12. [Event-Driven] When consumers subscribe to structural changes, the system shall publish `MiniDom.Events` streams powered by the Effect Reactivity service, avoiding bespoke polling-based implementations.
13. [State-Driven] When adapters surface dependency injection hooks, each shall export standardized `layer` and `make` helpers along with advertised capability metadata for integration into Effect Layer graphs.
14. [Optional] When registries require backend-specific metadata (e.g., SQL column hints or KV storage directives), the system shall support typed `extensions` fields that coexist with core schema definitions without weakening type safety.

> Follow-up React host adapter deliverables (FR1.16) are tracked separately in `.specs/minidom-react-host/`.

## Technical Specifications
- Package name: `@effect-native/minidom`; location: `packages-native/minidom` within the monorepo.
- Implement pure TypeScript modules compatible with `effect@^3.17` patterns (generator-friendly APIs, tagged errors, Effect Schema integrations).
- Provide clear separation between core data structures (nodes, attributes, documents) and the schema/registry layer to keep standard functionality minimal.
- Ensure all public APIs are side-effect free, deterministic, and environment-neutral (no DOM globals, no browser detection).
- Surfaces must export types and factory helpers that can participate in Effect-based workflows (Effect Schema, Document builders, validators).
- All effectful MiniDom APIs (document accessors, mutation operations, traversal) shall return `Effect.Effect` values to preserve synchronous/async flexibility while forbidding raw Promise returns.
- Declare `happy-dom` as an optional peer dependency and a development dependency to support testing and the concrete `HappyMiniDom` adapter.
- Export concrete adapters at `@effect-native/minidom/HappyMiniDom` and `@effect-native/minidom/WindowMiniDom`, with the latter exposing `layer({ window })` and `make({ window })` APIs satisfying the stated Layer/Effect contracts.
- Define capability descriptors (e.g., `Sync`, `Events`, `Transaction`, `Composite`) so hosts can interrogate implementation support at runtime.
- Specify a capability-based handle contract (`MiniDom.Handle`) that leaves identity management to adapters while guaranteeing comparison and optional serialization hooks.
- Reuse the existing Effect Reactivity service for event streams instead of introducing a bespoke change-notification framework.
- Provide a canonical React reconciler host adapter that consumes MiniDom capabilities (including Sync/Events) to bridge synchronous and asynchronous backends via Suspense.
- Standardize tagged error classes (`MiniDomError` union) for schema violations, backend failures, conflicts, and unsupported features.
- Expose attribute data through a synchronous snapshot view plus effectful fetch/mutation paths that lazy or remote stores can implement.
- Document composition patterns via a `MiniDom.Composite` helper (or equivalent) that routes operations across multiple providers while enforcing ownership.

## Acceptance Criteria
1. [Ubiquitous] AC1 mirrors CR1: The published package exposes namespace-aware core interfaces matching the documented minimal DOM subset.
2. [Ubiquitous] AC2 mirrors CR2: Standard interfaces and non-standard schema utilities are delivered as separately importable modules.
3. [Event-Driven] AC3 mirrors CR3: Registry authoring enables declaration of parent/child/attribute rules with Effect Schema primitives.
4. [Event-Driven] AC4 mirrors CR4: Tree validation against a registry produces deterministic Effect errors on invalid structures.
5. [State-Driven] AC5 mirrors CR5: Mutation utilities follow the modern DOM method set without legacy insertion APIs.
6. [Optional] AC6 mirrors CR6: JSX integration is available via factory adapters and optional typings/codegen without React dependency.
7. [Optional] AC7 mirrors CR7: Installing the optional `happy-dom` peer dependency enables the `HappyMiniDom` implementation exported at `@effect-native/minidom/HappyMiniDom`.
8. [Event-Driven] AC8 mirrors CR8: `WindowMiniDom.layer({ window })` returns a `Layer.Layer<MiniDom>` and `WindowMiniDom.make({ window })` returns an `Effect.Effect<MiniDom>` using the provided window.
9. [State-Driven] AC9 mirrors CR9: All effectful MiniDom APIs return `Effect.Effect` instances and integrate cleanly with `Effect.gen`, enabling synchronous or asynchronous implementations without exposing Promises and surfacing synchronous affordances via `MiniDom.Sync`.
10. [Event-Driven] AC10 mirrors CR10: Composition utilities allow multiple implementations to own disjoint subtrees while preventing cross-provider mutation leakage.
11. [Event-Driven] AC11 mirrors CR11: Implementations offering transactions expose `withTransaction` and propagate conflicts through the shared `MiniDomError` taxonomy.
12. [Event-Driven] AC12 mirrors CR12: `MiniDom.Events` streams reuse the Effect Reactivity layer to deliver low-latency invalidations without polling.
13. [State-Driven] AC13 mirrors CR13: Adapter packages export standardized `layer`/`make` helpers and capability descriptors for dependency injection.
14. [Optional] AC14 mirrors CR14: Registry definitions accept typed `extensions` metadata without compromising core type checks.

## Out of Scope
- Implementing concrete HTML/SVG/MathML registries beyond minimal illustrative fixtures.
- Providing runtime DOM rendering or hydration; the package models data structures, not browser interaction.
- Shipping web components or platform bindings.
- Performance optimizations beyond clarity-first implementation.

## Success Metrics
- SM1: Core API coverage for namespace-aware nodes validated via automated unit tests referencing AC1/AC5.
- SM2: Schema/registry layer demonstrates enforcement of parent/child/attribute rules with failing test evidence linked to AC3/AC4.
- SM3: Separation of standard vs. extensions verified by module-level smoke tests and documentation referencing AC2.
- SM4: JSX adapter sample compiles and validates against TypeScript checks aligning with AC6.
- SM5: Optional adapters are validated via tests showing `HappyMiniDom` works with happy-dom and `WindowMiniDom` produces the required Layer/Effect outputs, covering AC7 and AC8.
- SM6: Usage samples and tests demonstrate end-to-end `Effect.gen` flows (e.g., accessing documents, nodes, and mutations) without interacting with Promises while checking `MiniDom.Sync` capabilities, covering AC9.
- SM7: Composition tests exercise multiple MiniDom providers sharing a tree and confirm ownership enforcement, covering AC10.
- SM8: Transactional adapters demonstrate atomic commits and conflict surfacing through shared errors, covering AC11.
- SM9: Observation tests prove the Reactivity-backed streams deliver timely updates relative to polling baselines, covering AC12.
- SM10: Adapter exports slot into representative Layer graphs using standardized `layer`/`make` helpers and capability metadata, covering AC13.
- SM11: Registry extensions with backend metadata preserve core type safety in TypeScript checks, covering AC14.

## Future Considerations
- Explore code generation to emit strict JSX intrinsic element declarations from registries.
- Investigate serialization/deserialization helpers (e.g., to/from XML/HTML strings) once core structures solidify.
- Consider adapters for existing ecosystems (React, Solid, Svelte) after validating core abstractions.
- Coordinate follow-up React reconciler host adapter work via `.specs/minidom-react-host/` to keep the core package React-free while enabling Suspense-aware integrations.
- Schedule a post-release naming audit to align MiniDom exports with existing Effect/@effect conventions (`.specs/minidom/plan.md` lists this follow-up).

## Testing Requirements
- Practice TDD: author failing unit tests (Effect/vitest) before implementations for each capability.
- Maintain fast feedback by keeping the MiniDom test suite within the 5-minute build guardrail.
- Cover positive and negative scenarios for schema validation and node mutation.
- Validate TypeScript typings via compiler tests or `@effect/vitest` type-level assertions where appropriate.
- Exercise optional integrations by guarding tests that require `happy-dom` while ensuring they run when the dependency is present, and verify `WindowMiniDom` Layer/Effect behavior via effect-based tests.
- Provide TDD scenarios that call MiniDom APIs exclusively through `Effect` combinators (e.g., `Effect.gen`) to verify synchronous and asynchronous implementations behave identically and never expose Promises while honoring `MiniDom.Sync` when advertised.
- Validate observation flows by wiring MiniDom.Events to the shared Reactivity service and demonstrating latency advantages over polling in tests.
- Exercise `MiniDom.Composite` in hybrid configurations to ensure ownership boundaries and validation behavior remain intact.
- Run transactional tests that generate conflicts to confirm `withTransaction` behavior and error taxonomy coverage.
- Smoke-test standardized Layer exports (`layer`, `make`, capability descriptors) inside sample Layer graphs for each adapter.
- Type-check registry definitions that include backend `extensions` metadata to ensure no degradation of core schema typings.
