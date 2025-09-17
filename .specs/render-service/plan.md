# Render Service — Phase 4 Plan

## 5-Phase Implementation Structure

- [ ] **Phase A — Foundations**
  - [ ] Scaffold `@effect-native/render` package (tsconfig, entrypoints, build scripts).
  - [ ] Define `RenderService` interface, Context tag, and driver contract skeletons.
  - [ ] Establish DOM + Native driver stubs with TODO runtime errors.
- [ ] **Phase B — DOM Driver MVP**
  - [ ] Implement DOM root management (`createRoot`, update, unmount) with scoped lifecycle.
  - [ ] Implement `render`, `withRoot`, and typed event adapters for DOM renderer.
  - [ ] Add React Testing Library coverage for multi-step renders and event bridging.
- [ ] **Phase C — Native Driver MVP**
  - [ ] Implement React Native driver using `AppRegistry` and `renderApplication` APIs.
  - [ ] Support event adapters and cleanup semantics mirrored from DOM driver.
  - [ ] Add Jest/React Native Testing Library coverage.
- [ ] **Phase D — Streaming + Utilities**
  - [ ] Implement `Render.stream`, `Render.subscribe` (PubSub integration), instrumentation hooks.
  - [ ] Add stress tests covering interruption, concurrency, and cleanup logging.
  - [ ] Polish error taxonomy and logging integration.
- [ ] **Phase E — Documentation & Demos**
  - [ ] Write comprehensive README + API docs with JSDoc examples.
  - [ ] Build DOM Loading/Data demo and DOM Streamed Search demo (Vite scripts).
  - [ ] Build React Native Counter demo (Expo config) and CLI interruption stress script.
  - [ ] Ensure `pnpm docgen`, `pnpm lint`, `pnpm check`, `pnpm test`, and demo scripts succeed.

## Task Hierarchies & Objectives

### Core Service Development
- Objective: Provide stable, typed render service bridging Effect ↔ React.
  - Task Group 1: Context + Driver contracts
    - Create `Render.ts`, `Driver.ts`, typed error modules.
    - Define `Render.layer` helpers for plugging drivers into Layers.
  - Task Group 2: DOM driver implementation
    - Manage DOM containers, reuse root between renders, ensure cleanup.
    - Provide event bridging and transitional updates (optionally `startTransition`).
  - Task Group 3: React Native driver implementation
    - Manage `AppRegistry` registration/unregistration.
    - Provide bridging for native events/props.

### Utilities & Streaming
- Objective: Enable advanced flows (streams, concurrency, instrumentation).
  - Implement `StreamRenderer` using `Effect.Stream.runForEach`.
  - Provide `Render.eventChannel` returning `Channel` for event consumption.
  - Instrument root manager with counters and optional logger integration.

### Documentation & Demos
- Objective: Deliver developer-ready guidance and proof of viability.
  - Author README with usage matrix, configuration, and integration notes.
  - Create `demos/dom-loading` (Vite) and `demos/dom-search` (Vite) with instructions + scripts.
  - Create `demos/native-counter` (Expo) and `demos/interrupt` (Node CLI) verifying cleanup metrics.
  - Document manual validation checklists for each demo.

## Validation Checkpoints

- `pnpm lint packages/render` after each module milestone.
- `pnpm check packages/render` to ensure type safety.
- `pnpm docgen --filter @effect-native/render` verifying JSDoc examples compile.
- Targeted tests:
  - DOM: `pnpm test packages/render/test/dom.spec.ts`
  - Native: `pnpm test packages/render/test/native.spec.ts`
  - Streams: `pnpm test packages/render/test/render.spec.ts`
- Demo scripts: `pnpm demo:render:dom-loading`, `pnpm demo:render:native-counter`, `pnpm demo:render:interrupt`.

## Risk Mitigation Strategies

- React Native environment complexity → use Expo-managed workflow, provide fallback instructions for bare React Native.
- Concurrent renders causing stale roots → maintain scoped registry keyed by container/appKey with reference counting.
- Event handler memory leaks → ensure event wrappers capture minimal state and register finalizers for cleanup on unmount.
- Type-level regressions → adopt `@ts-expect-error` tests verifying compile-time failures when misuse occurs.
- Demo drift → automate smoke tests invoking demos in CI (headless DOM, mocked Native) to detect breakage early.

## Success Criteria Validation

- Cross-reference FR1.x requirements with tasks: DOM/Native driver tasks satisfy FR1.1–FR1.7; streaming tasks satisfy FR1.8; asynchronous props handled via `withRoot` pipeline.
- Performance metric (<16ms) validated via React Profiler measurements recorded in demo READMEs.
- Cleanup verified by instrumentation logs asserting zero active roots after interruption tests.
- Documentation check: docgen + README + demo READMEs reviewed before release.

## Progress Tracking System

- Maintain `STATUS.md` inside package with checklist mirroring plan, updated per commit.
- Use commit message prefixes (`feat(render)`, `test(render)`, `docs(render)`) to categorize progress.
- Add GitHub Project cards for each phase/deliverable, linking to spec sections for traceability.
- Record demo metrics (latency, event round-trip time) in `demos/REPORT.md` for historical tracking.
