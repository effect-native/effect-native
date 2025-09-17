# Render Service — Phase 3 Design

## Effect Library Patterns

- Use `Effect.gen` generators to orchestrate render sessions, ensuring each render call is modeled as an Effect that updates the mounted tree.
- Wrap React root creation within `Scope.extend` to tie lifecycle to Effect scopes; renders happen inside scoped regions to enable auto-unmount on scope exit/interruption.
- Provide service APIs via `Context.Tag<typeof Render>` and Layers (`Render.layerDom`, `Render.layerNative`) built from driver constructors that run inside `Effect.gen`.
- Employ `Effect.async` to bridge React events back into Effect, resuming the waiting fiber via callback triggers while preserving interruption semantics.
- Use `Channel` / `Stream` integration for streaming updates: `Render.stream` consumes `Stream<ReactNode>` and sequentially renders values.

## Type Safety Approach

- Use discriminated union error types defined via `Data.TaggedError` (e.g., `RenderDriverUnavailable`, `RenderRootNotFound`).
- Define `RenderRoot<TRenderer>` generic to encode renderer-specific metadata (DOM container vs Native app key) without `any`.
- Provide typed event adapters: `Render.event<Event, E, A>(handler: (event: Event) => Effect<A, E>)` returns a React callback typed as `(event: Event) => void` but ensures the handler returns typed Effect.
- Avoid type assertions by modeling driver interfaces precisely, e.g., `interface RenderDriver<RNode> { readonly makeRoot: ... }`.

## Module Architecture

```
packages/render/
  src/
    Render.ts (public service interface + Layer combinators)
    Driver.ts (driver interface + constructors)
    drivers/
      dom.ts (React DOM implementation)
      native.ts (React Native implementation)
    internal/
      RootManager.ts (scoped root registry)
      EventBridge.ts (Effect-aware callback wrappers)
      StreamRenderer.ts (consumes streams)
  demos/
    dom-basic/
    native-basic/
  test/
    render.spec.ts
    dom.spec.ts
    native.spec.ts
```

- `Render.ts` exports `Render` context tag, `RenderService` interface, `render`, `withRoot`, `stream`, `event` helpers.
- `Driver.ts` defines driver contract and implements factory functions returning Layers.
- Internal modules handle resource management (scoped registries with `Effect.Ref` or `Effect.Scope`).
- Demo apps live under `packages/render/demos/` to keep them close to service.

## Error Handling Strategy

- All driver operations run inside `Effect.gen`; errors thrown by React APIs (e.g., invalid container) captured and wrapped in typed errors via `yield* new RenderDriverError({ cause })`.
- Interruption handling: register finalizers on scopes to call `root.unmount()` or `AppRegistry.unmountApplicationComponentAtRootTag`.
- Event handlers propagate errors by failing the awaiting effect; optionally provide `Render.eventSync` for fire-and-forget.
- Provide `Render.onError` hook in driver configuration to log errors and optionally rethrow.

## Testing Strategy

- Unit tests with `@effect/vitest` verifying `render` updates DOM using React Testing Library (JSDOM environment) and ensures repeated renders update existing nodes.
- Use TestClock to simulate asynchronous flows (delayed fetch) and assert multi-step rendering.
- React Native tests run with `react-native-testing-library` in Jest environment, verifying event bridging and unmount.
- Stream tests create `Stream.fromIterable` of React elements and verify sequential renders occur.
- Stress/integration tests simulate interruptions by forking an effect, rendering UI, then interrupting fiber and asserting unmount.

## JSDoc Documentation Plan

- Document `Render` service with `@category Services` and provide `@example` sections for DOM + React Native usage.
- Provide `@example` for streaming demo: `yield* Render.stream(Stream.make(...))`.
- Document driver configuration options (container, root component, transitions) with inline types.
- Ensure docgen references compile by using actual exported helpers in examples.

## Code Examples

```ts
import { Effect, Layer } from "effect";
import { Render } from "@effect-native/render";
import { domLayer } from "@effect-native/render/dom";
import { createRootContainer } from "./dom/roots";

const program = Effect.gen(function* () {
  const { render, withRoot, event } = yield* Render;
  const root = yield* withRoot({ container: createRootContainer("app") });

  yield* render(root, <Status text="Loading…" />);

  const data = yield* fetchUserProfile;

  const onRefresh = event((evt: React.MouseEvent<HTMLButtonElement>) =>
    Effect.gen(function* () {
      yield* logDebug({ type: "refresh", x: evt.clientX });
      yield* render(root, <Status text="Refreshing…" />);
    })
  );

  yield* render(
    root,
    <ProfileView data={data} onRefresh={onRefresh} />
  );

  const next = yield* waitFor(onRefresh);
  yield* render(root, <Status text={`Refreshed at ${next}`} />);
});

program.pipe(Effect.provide(domLayer({ container: document.getElementById("app")! })), Effect.runFork);
```

### Stream Example

```ts
yield* Render.stream(root, Stream.fromIterable([
  <Status key="loading" text="Loading" />,
  <Status key="ready" text="Ready" />
]));
```

### React Native Demo Snippet

```ts
const nativeLayer = Render.layerNative({
  appKey: "EffectDemo",
  component: RootComponent,
});

const nativeProgram = Effect.gen(function* () {
  const { render, withRoot, event } = yield* Render;
  const root = yield* withRoot({ component: <Root /> });
  yield* render(root, <AppScreen status="Booting" />);

  const result = yield* fetchFromNetwork;
  yield* render(root, <AppScreen status={result.status} />);
});
```

## Integration Points

- Provide `Render.layerTest` returning a deterministic in-memory driver for unit tests.
- Expose adapters for `Effect.Stream`, `PubSub`, and `SubscriptionRef` to push updates.
- Logging integration via `Logger` service: drivers accept logger for lifecycle events.
- Interop with `Scope` ensures compatibility with other services that use scoped resources (e.g., database connections that update UI when ready).
- Provide React context provider for hooking into effect-managed state if needed.

## Demos

1. **DOM Loading/Data Demo**
   - Tooling: Vite + SWC bundler, React 18.
   - Flow: render "Loading", wait 1s, fetch JSON from mock API, render data table, allow button to trigger re-fetch using `Render.event`.
   - Validates FR1.2, FR1.4, FR1.5 (by interrupt test hooking to UI close button).

2. **DOM Streamed Search Demo**
   - Uses `Render.stream` to live-update search results as user types, bridging `SubscriptionRef` to React input value.
   - Showcases low-latency updates and event bridging to `Effect.debounce`.

3. **React Native Counter Demo (Expo)**
   - Render initial count, button increments by bridging events.
   - Demonstrates multi-render flow and ensures unmount when effect stops (closing app stops effect fiber).

4. **Interruption Stress Demo**
   - CLI script using DOM driver in JSDOM to render 100 updates, then interrupt mid-stream, verifying cleanup instrumentation logs.

Each demo includes README with setup, `pnpm demo:<name>` script, and instrumentation metrics.
