# MiniDom Feature Instructions

## Overview and User Story
As framework maintainers building Effect-native tooling, we need a reusable MiniDom package that offers a browser-agnostic DOM subset plus an extensible schema layer so that teams implementing HTML, SVG, MathML, or custom DSLs can share infrastructure.

## Core Requirements (EARS)
1. [Ubiquitous] MiniDom shall expose namespace-aware TypeScript interfaces for nodes, elements, documents, and fragments that mirror the modern DOM subset outlined in `.specs/domdb/research.md` while remaining environment-agnostic.
2. [Ubiquitous] MiniDom shall separate standard DOM-like primitives from non-standard extensions by delivering a composable "MiniDomX" layer that hosts registries, schema DSL, and validators.
3. [Event-Driven] When defining a custom element (standard or user-defined), the system shall allow authors to declare valid parent/child relationships, required descendants, and attribute constraints using Effect Schema.
4. [Event-Driven] When validating a node tree against a registry, the system shall raise structured Effect errors if structural, ordering, or attribute requirements are violated.
5. [State-Driven] While using MiniDom APIs to construct or mutate trees, the system shall support modern mutation helpers (`append`, `prepend`, `replaceChildren`, `before`, `after`, `replaceWith`, `remove`) without exposing historical DOM insertion APIs.
6. [Optional] When consumers opt into JSX integration, the system shall provide a factory-compatible node representation and optional code generation hooks to tighten `JSX.IntrinsicElements` typings without adding React as a dependency.

## Technical Specifications
- Package name: `@effect-native/minidom`; location: `packages-native/minidom` within the monorepo.
- Implement pure TypeScript modules compatible with `effect@^3.17` patterns (generator-friendly APIs, tagged errors, Effect Schema integrations).
- Provide clear separation between core data structures (nodes, attributes, documents) and the schema/registry layer to keep standard functionality minimal.
- Ensure all public APIs are side-effect free, deterministic, and environment-neutral (no DOM globals, no browser detection).
- Surfaces must export types and factory helpers that can participate in Effect-based workflows (Effect Schema, Document builders, validators).

## Acceptance Criteria
1. [Ubiquitous] AC1 mirrors CR1: The published package exposes namespace-aware core interfaces matching the documented minimal DOM subset.
2. [Ubiquitous] AC2 mirrors CR2: Standard interfaces and non-standard schema utilities are delivered as separately importable modules.
3. [Event-Driven] AC3 mirrors CR3: Registry authoring enables declaration of parent/child/attribute rules with Effect Schema primitives.
4. [Event-Driven] AC4 mirrors CR4: Tree validation against a registry produces deterministic Effect errors on invalid structures.
5. [State-Driven] AC5 mirrors CR5: Mutation utilities follow the modern DOM method set without legacy insertion APIs.
6. [Optional] AC6 mirrors CR6: JSX integration is available via factory adapters and optional typings/codegen without React dependency.

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

## Future Considerations
- Explore code generation to emit strict JSX intrinsic element declarations from registries.
- Investigate serialization/deserialization helpers (e.g., to/from XML/HTML strings) once core structures solidify.
- Consider adapters for existing ecosystems (React, Solid, Svelte) after validating core abstractions.

## Testing Requirements
- Practice TDD: author failing unit tests (Effect/vitest) before implementations for each capability.
- Maintain fast feedback by keeping the MiniDom test suite within the 5-minute build guardrail.
- Cover positive and negative scenarios for schema validation and node mutation.
- Validate TypeScript typings via compiler tests or `@effect/vitest` type-level assertions where appropriate.
