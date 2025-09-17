# Render Service — Phase 2 Requirements

## Functional Requirements (FR1.x)

- **FR1.1** The service MUST expose an Effect Context tag (`Render`) with a `render` function returning an `Effect` that performs a React render against a mounted root.
- **FR1.2** The service MUST allow multiple sequential `render` calls within the same fiber to update the same React tree without remounting.
- **FR1.3** The service MUST expose helper APIs for mounting and disposing render roots (`withRoot`, `makeRoot`) that wrap renderer-specific lifecycle management.
- **FR1.4** The service MUST adapt React event callbacks into Effect handlers that resume the originating fiber, including error propagation through Effect failure channels.
- **FR1.5** The service MUST propagate fiber interruption to React unmount, guaranteeing that cancelling the calling Effect tears down the UI and cleans up resources.
- **FR1.6** The service MUST surface renderer-specific drivers so applications can choose DOM vs React Native at Layer composition time.
- **FR1.7** The service MUST support running multiple independent render roots simultaneously (e.g., multiple DOM containers, multiple React Native root components).
- **FR1.8** The service MUST provide convenience helpers for streaming data to UI (e.g., bridging from `Effect.Stream` or `SubscriptionRef`).
- **FR1.9** The service MUST allow passing asynchronous props (Effects returning values) that are awaited before render, enabling `yield* render(<Component data={yield* fetch} />)` semantics.
- **FR1.10** The service MUST offer typed error classes (e.g., `RenderRootError`, `RenderDriverUnavailableError`) for predictable failure handling.

## Non-Functional Requirements (NFR2.x)

- **NFR2.1** The API MUST be fully typed with zero `any` usage and no unsafe assertions.
- **NFR2.2** The service MUST maintain stable render performance with <16ms median update time in provided demos under typical workloads.
- **NFR2.3** The implementation MUST be platform-agnostic, enabling addition of new renderer drivers without modifying core logic.
- **NFR2.4** The public API MUST include comprehensive JSDoc with runnable examples validated by docgen.
- **NFR2.5** The package MUST comply with repository tooling: lint, typecheck, docgen, and tests must pass.
- **NFR2.6** The service MUST be resilient to concurrent renders from multiple fibers, avoiding race conditions and ensuring thread safety via Effect primitives.
- **NFR2.7** The design MUST avoid React-specific global state (no singletons that prevent multiple React versions in the same process).

## Technical Constraints (TC3.x)

- **TC3.1** React version MUST be 18.3 or higher, using concurrent rendering APIs (`createRoot`).
- **TC3.2** The service MUST NOT rely on DOM-specific APIs in core modules; DOM APIs must live in DOM driver implementations.
- **TC3.3** React Native integration MUST rely on officially supported APIs (e.g., `AppRegistry`, `renderApplication`) without private module imports.
- **TC3.4** The implementation MUST remain ESM-first and compatible with Node 18+/Bun targets per repository standard.
- **TC3.5** No side effects during module evaluation besides Context tag definitions; render roots must be created lazily via Effects.
- **TC3.6** The service MUST preserve Effect's structured concurrency semantics—no manual `Promise` usage outside `Effect.async` wrappers.

## Data Requirements (DR4.x)

- **DR4.1** The service MUST manage internal state describing mounted roots (IDs, containers, cleanup actions) stored in managed refs/scopes.
- **DR4.2** Event payloads MUST be typed generically, allowing bridging of DOM events, React Native gestures, and custom objects.
- **DR4.3** Telemetry/diagnostic hooks (if implemented) MUST emit structured data (JSON-serializable objects) for logging and devtools.
- **DR4.4** Demo applications MUST include sample data flows (e.g., asynchronous fetch results) stored in typed models for clarity.

## Integration Requirements (IR5.x)

- **IR5.1** The Render service MUST integrate with existing Effect Layer composition; e.g., `Render.layerDom` should compose with other layers in an application environment.
- **IR5.2** The service MUST interoperate with `effect/Scope` for lifecycle management, automatically releasing resources when the scope ends.
- **IR5.3** Event bridging MUST integrate with `Effect.Channel`/`Stream` where appropriate, enabling consumption via streaming APIs.
- **IR5.4** Demo apps MUST integrate with bundlers/build tools typical for DOM (Vite) and React Native (Expo/Metro) to validate feasibility.

## Dependencies (DEP6.x)

- **DEP6.1** External dependencies limited to `react`, `react-dom`, `react-native` (and type packages) plus existing Effect libraries.
- **DEP6.2** Development/test dependencies may include React Testing Library, React Native Testing Library, and @testing-library/jest-native.
- **DEP6.3** The service MUST leverage existing repository utilities for logging, scheduling, and concurrency if available.
- **DEP6.4** Demo applications MAY depend on bundler/tooling packages but should remain minimal.

## Success Criteria (SC7.x)

- **SC7.1** Specification acceptance when requirements documentation, design, and plan are approved and demos outlined.
- **SC7.2** Implementation acceptance when demos run successfully, automated tests pass, and documentation published.
- **SC7.3** Developer happiness measured by ability to copy-paste demo code into a new project with minimal setup (<5 steps).
- **SC7.4** Observability: instrumentation surfaces mount/update/unmount counts in logs for debugging.
- **SC7.5** Clean teardown confirmed by memory usage snapshots before/after long-running demos (no growth beyond 5%).
