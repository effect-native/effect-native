# Render Service — Phase 1 Instructions

## Overview and User Story

Build an Effect-native Render service that lets Effect programs drive React component trees imperatively from within `Effect.gen` generators. The service should expose a render function that can be yielded multiple times, allowing Effect workflows to stream UI updates (loading → data, error recovery, etc.) without leaving the Effect runtime. Inputs (props, event callbacks, async data) should round-trip through Effect effects, giving developers a unified concurrency and resource management model while reusing familiar React component ecosystems.

Primary user story:
- As an Effect developer building cross-platform apps, I want to yield React renders directly inside my Effect generators so I can orchestrate asynchronous flows (fetch → optimistic UI → resolved UI) without React-specific hooks, while still leveraging the React renderer for DOM / Native output.

## Core Requirements

- Provide an Effect Service (Layer + Context) exposing a `render` function that can be yielded in generators. The render function should accept a React element tree and optional options (target root, key, transitions) and return the rendered result handle.
- Support multi-step rendering within a single Effect: repeated `yield* Render.render(<UI />)` calls should update the mounted tree without remounting or leaking resources.
- Event callbacks passed as props must integrate with Effect: the service should wrap callbacks so that invocations resume the originating Effect fiber with typed event payloads.
- Provide cancellable rendering: interrupting the calling Effect should tear down the React tree, dispose listeners, and release resources cleanly.
- Support at least two renderers in v1:
  - Web (React DOM via `react-dom/client`)
  - React Native (using `react-native` or `react-native-renderer` adapter)
- Support hydration / server handoff as future consideration but not v1 requirement.
- Provide ergonomic options for running render loops (e.g., `Render.withRoot`, `Render.portals`, etc.) while remaining renderer-agnostic.
- Deliver clear DX: strongly typed API, JSDoc examples, compatibility notes, error taxonomy.

## Technical Specifications

- Package name: `@effect-native/render` (new workspace package).
- Target React 18.3+ concurrent APIs (`createRoot`, `startTransition`).
- Provide platform-specific drivers (DOM, Native) behind an Effect-managed abstraction, selected via environment-specific Layer composition.
- Compose with `effect/Layer` for dependency injection: e.g., `Render.layer(RenderDriver.dom({ container }))`.
- The render API must be re-entrant and safe under concurrent usage: multiple fibers should be able to render to independent roots simultaneously.
- Provide typed event channel bridging React synthetic/native events to Effect: e.g., `Render.event<T>(handler: (event: T) => Effect<...>)`.
- Ensure compatibility with SSR contexts: allow injection of custom renderer (No-op) for testing.
- Provide integration points for streaming data (maybe `Render.stream` bridging to `Effect.Stream`?).

## Acceptance Criteria

- API allows an Effect generator to render loading / success states sequentially without remount flicker on both DOM and React Native sample apps.
- Event callback bridging demonstrably works: a demo effect can await a button click (DOM) and update UI accordingly.
- Interruption cleans up renders: tests confirm that cancelling the effect unmounts the React tree.
- Provide documentation covering setup, usage patterns, and demos for DOM + React Native.
- Works with repository lint/typecheck/docgen/test suites.

## Out of Scope

- Building a fully featured router or state management library.
- Implementing SSR or server components (hydration can be deferred).
- Custom renderer creation beyond DOM and React Native drivers.
- Backwards compatibility with React < 18.
- Non-React UI frameworks (Solid, Vue, etc.).

## Success Metrics

- Demo apps (DOM + React Native) show <16ms render latency for successive updates in common cases.
- Event bridging introduces <1 microtask overhead relative to direct React callback (measured in demos/tests).
- Zero leaked React roots in stress tests (tracked via driver instrumentation).
- Positive developer feedback: Example code copy-paste works with minimal configuration.

## Future Considerations

- Support React Server Components / SSR hydration to allow seamless server/client transitions.
- Add integration with streaming sources (`Effect.Stream`, `Channel`) for incremental UI updates.
- Provide developer tools (DevTools integration, logging, instrumentation).
- Extend to VR/AR or custom renderers through adapter interface.
- Add compatibility layers for frameworks (Next.js, Expo) via pre-built Layers.

## Testing Requirements

- Unit tests for driver lifecycle (mount, update, unmount) and event bridging.
- Integration tests using React Testing Library / React Native Testing Library to assert multi-step renders.
- Stress tests to simulate rapid updates and interruptions.
- Docgen tests to ensure API examples compile.
- Demos executed during CI smoke tests (if feasible) or documented manual verification steps.
