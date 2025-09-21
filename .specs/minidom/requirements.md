# MiniDom Requirements

## Functional Requirements

### [Ubiquitous] FR1.1 Core Namespace-Aware Interfaces
When consuming the package, the system shall provide namespace-aware TypeScript interfaces for nodes, elements, documents, and fragments that align with the minimal DOM subset defined in `.specs/minidom/research.md`.

### [Ubiquitous] FR1.2 Standard vs. Extension Modules
When importing APIs, the system shall expose standard DOM-like primitives separately from non-standard schema utilities so that consumers can opt into only the abstractions they require.

### [Event-Driven] FR1.3 Registry Authoring
When defining a custom or standard element, the system shall allow authors to declare valid parents, valid children, required descendants, and attribute constraints using Effect Schema constructs.

### [Event-Driven] FR1.4 Structural Validation Errors
When validating a node tree against a registry, the system shall raise structured Effect errors whenever structural, ordering, or attribute constraints are violated.

### [State-Driven] FR1.5 Modern Mutation Helpers
While mutating MiniDom trees, the system shall provide the modern DOM mutation helpers (`append`, `prepend`, `replaceChildren`, `before`, `after`, `replaceWith`, `remove`) without exposing legacy insertion APIs.

### [Optional] FR1.6 JSX Integration Hooks
When consumers opt into JSX usage, the system shall offer a factory-compatible node representation and optional code-generation hooks that tighten `JSX.IntrinsicElements` typings without bundling React and without a hard package dependency on react.

### [Optional] FR1.7 HappyMiniDom Adapter
When the optional `happy-dom` dependency is present, the system shall expose `@effect-native/minidom/HappyMiniDom` as a concrete MiniDom implementation powered by happy-dom.

### [Event-Driven] FR1.8 WindowMiniDom Adapter
When provided `WindowMiniDom.layer({ window })` or `WindowMiniDom.make({ window })`, the system shall construct `Layer.Layer<MiniDom>` and `Effect.Effect<MiniDom>` instances bound to the supplied `window: Window`.

### [State-Driven] FR1.9 Effect-Native API Surface
While invoking any effectful MiniDom operation (e.g., document accessors, node creation, mutations, traversal), the system shall return `Effect.Effect` values so implementations can execute synchronously or asynchronously without exposing Promises.

## Non-Functional Requirements

### NFR2.1 Deterministic Behavior
The system shall operate deterministically and remain side-effect free, avoiding reliance on browser globals or environment detection.

### NFR2.2 Performance Guardrail
The build and full test suite for the MiniDom package shall complete within five minutes on the reference development hardware to uphold the guardrail.

### NFR2.3 Type Safety
All publicly exported TypeScript APIs shall compile with strict settings without using forbidden type assertions (`as any`, `as unknown as T`, etc.).

### NFR2.4 Documentation Quality
All public APIs shall include JSDoc with `@example` usage that passes `pnpm docgen` validation.

## Technical Constraints

### TC3.1 Package Layout
The implementation shall reside under `packages-native/minidom` and publish under the npm scope `@effect-native/minidom`.

### TC3.2 Effect Compatibility
The implementation shall depend on `effect@^3.17` (and related Effect ecosystem packages) and follow generator-friendly patterns such as `return yield*` in `Effect.gen`.

### TC3.3 Dependency Policy
The system shall declare `happy-dom` as both an optional peer dependency and a development dependency, without making it a required runtime dependency.

### TC3.4 Testing Tooling
All tests shall use `@effect/vitest` conventions, including `it.effect` for Effect-based flows and `TestClock` when time control is necessary.

## Data Requirements

### DR4.1 Registry Schema Representation
Registry definitions shall be represented using Effect Schema constructs capable of expressing order, multiplicity, choice, interleave, and transparent content models.

### DR4.2 Attribute Bag Abstraction
Attributes shall be modeled through an `AttributeBag` abstraction that supports namespace-aware `get`, `set`, `has`, `delete`, and iteration semantics.

### DR4.3 Node Metadata Storage
Each node shall track references to owner document, parent, previous sibling, next sibling, and text content where applicable to mirror DOM relationships.

## Integration Requirements

### [Event-Driven] IR5.1 Effect Layer Integration
When integrating with Effect, the system shall expose Layer builders that compose with existing Effect Layer graphs for dependency injection.

### [Event-Driven] IR5.2 Schema Export Interop
When consumers request schema interoperability, the system shall provide a mechanism to export Effect Schema definitions to Standard Schema v1 for external tooling.

## Dependencies

### DEP6.1 Required Dependencies
The package shall depend on Effect core libraries (e.g., `effect`, `@effect/schema`) and other internal Effect-native utilities as needed.

### DEP6.2 Optional Dependencies
The package shall list `happy-dom` as an optional peer and development dependency for the `HappyMiniDom` adapter while keeping runtime behavior functional without it.

## Success Criteria

### SC7.1 Core API Validation
Passing automated tests that exercise namespace-aware node operations shall demonstrate compliance with FR1.1, FR1.5, and FR1.9.

### SC7.2 Separation Verification
Module-level smoke tests and documentation shall confirm that standard primitives and extension utilities remain independently consumable, satisfying FR1.2.

### SC7.3 Registry Enforcement Evidence
Failing-and-then-passing tests shall show registry enforcement raising structured errors, satisfying FR1.3 and FR1.4.

### SC7.4 JSX Hook Validation
Type-checking and example compilation shall confirm JSX integration behavior, satisfying FR1.6.

### SC7.5 Adapter Coverage
Tests shall confirm `HappyMiniDom` behavior when `happy-dom` is installed and validate `WindowMiniDom.layer`/`make` outputs, covering FR1.7 and FR1.8.

### SC7.6 Effect Integration Confidence
Scenario tests and usage examples shall verify MiniDom APIs participate seamlessly in `Effect.gen` workflows without requiring manual Promise handling, satisfying FR1.9.

### SC7.7 Non-Functional Compliance
Build, lint, docgen, and test automation shall pass within the guardrail limits, demonstrating adherence to NFR2.1–NFR2.4.
