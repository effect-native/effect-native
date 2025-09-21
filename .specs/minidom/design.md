# MiniDom Design

## Effect Library Patterns
- Resource management relies on `Layer` and `Scope`; every adapter (HappyMiniDom, WindowMiniDom, SQL/KV variants) exposes `layer`/`make` that allocate resources via `Layer.scoped` or `Layer.effect` (`TC3.1`, `FR1.13`).
- Core operations are implemented with `Effect.gen`, returning `Effect.Effect` for every effectful action (`FR1.9`).
- Change notifications reuse the existing `@effect/experimental` Reactivity service by wrapping `Reactivity.mutation/query/stream` inside MiniDom-specific helpers, satisfying `FR1.12` and `TC3.6`.
- Composition (`FR1.10`) uses a `MiniDom.Composite` layer that delegates to child services through capability inspection; mutations across providers are guarded via `Effect.flatMap` checks that yield `MiniDomError.Unsupported` when boundaries are crossed.

## Type Safety Approach
- Prefer precise interfaces, no unsafe assertions per repository policy; complex return types rely on Effect Schema and branded types.
- Attribute access uses two shapes:
  - `AttributeBag.View` – immutable snapshot with inferred types.
  - `AttributeBag.Service` – effectful interface returning `Effect` for lazy stores (`DR4.4`, `FR1.17`).
- Capability descriptors (`MiniDom.Sync`, `MiniDom.Events`, `MiniDom.Transaction`, `MiniDom.Composite`) are branded literal unions with helper guards; consumers can narrow behavior without casts (`TC3.5`).

## Module Architecture
- `packages-native/minidom/src/core` – shared interfaces (nodes, documents, AttributeBag), capability descriptors, tagged errors (`FR1.15`).
- `packages-native/minidom/src/schema` – MiniDomX DSL, registry extensions, Effect Schema integrations (`FR1.3`, `FR1.14`).
- `packages-native/minidom/src/events` – thin wrapper around Reactivity service exporting `MiniDom.Events` (`FR1.12`).
- `packages-native/minidom/src/composite` – router that maps namespace/prefix to adapters; enforces ownership boundaries (`FR1.10`, `IR5.3`).
- `packages-native/minidom/src/react-host` – canonical React reconciler host adapter driven by capabilities, supports Suspense for async adapters (`FR1.16`, `IR5.4`, `TC3.7`).
- Adapter folders (`happy-dom`, `window`, future `sql`, `kv`) each expose `layer`, `make`, capability metadata, and adapter-specific configuration.

## Error Handling Strategy
- Define `MiniDomError` as `Data.TaggedError` union with cases: `SchemaViolation`, `BackendFailure`, `Conflict`, `Unsupported`, `ObservationFailure` (`FR1.15`).
- All validation failures raised via Effect Schema integrate with `MiniDomError.SchemaViolation` to preserve context (`FR1.4`).
- Transaction conflicts surface `MiniDomError.Conflict` when `withTransaction` aborts (`FR1.11`).
- Unsupported cross-provider operations in composite layer raise `MiniDomError.Unsupported` before side effects occur.

## Testing Strategy
- Unit tests built with `@effect/vitest`, `it.effect` pattern (`TC3.4`).
- Capability matrix tests ensure capability descriptors reflect adapter behavior (`SC7.10`).
- Composite tests: mix in-memory + mock remote adapters; verify enforcement and aggregated validation (`SC7.7`).
- Observation tests: simulate change streams via Reactivity; compare to polling baseline to demonstrate latency (`SC7.9`).
- Transaction tests: SQL/KV mocks ensure `withTransaction` atomicity and conflict errors (`SC7.8`).
- React host tests: run reconciler against sync (HappyMiniDom) and async (mock remote) adapters with Suspense; ensure ops align with capabilities (`SC7.12`).

## JSDoc Documentation Plan
- Every public API uses `@since` and `@category` tags consistent with existing packages.
- `@example` snippets highlight TDD usage: constructing trees via `Effect.gen`, subscribing via `MiniDom.Events.stream`, composing multiple providers.
- Docgen coverage includes capability descriptors and error types (`NFR2.4`).

## Code Examples
- `Effect.gen` snippet assembling a document, appending nodes, checking `MiniDom.Sync` before running `Effect.runSync`. (`FR1.9`, `SC7.6`).
- Composition example creating a router that hands HTML namespace to in-memory adapter and SVG to remote SQL/persisted adapter (`FR1.10`).
- React host usage example mounting a MiniDom adapter with Suspense fallback for async nodes (`FR1.16`).
- Transaction example using `withTransaction` to update attributes atomically and handle `MiniDomError.Conflict` (`FR1.11`).

## Integration Points
- Layers integrate with existing Effect services: `WindowMiniDom` depends on `Layer.succeed({ window })`, SQL adapter depends on `SqlClient` layer, etc. (`IR5.1`, `DEP6.1`).
- Schema exports map to Standard Schema v1 for tooling; registry extensions provide optional metadata for persistence layers (`IR5.2`, `DR4.5`).
- Observation features share `Reactivity` to align with EventLog infrastructure (`IR5.5`).
- React integration routes through the canonical host adapter; capabilities guide host behavior to avoid branching per backend (`IR5.4`).
- Composite router coordinates multiple adapters in a single tree, combining validation results before returning to callers (`IR5.3`, `SC7.7`).
