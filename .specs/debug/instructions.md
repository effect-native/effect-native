# Debug Service Instructions

## Overview and User Story
We need a new `@effect-native/debug` package that provides an Effect Service named `Debug`. The service must offer a protocol-agnostic abstraction for connecting to JavaScript runtimes through debugger protocols (Chrome DevTools Protocol, Firefox Remote Debug Protocol, WebKit Web Inspector, Servo/Ladybird RDP variants, etc.). As an ultra extreme programming team, our first customer value slice is the ability to attach to a running Chromium-based browser instance using CDP so that we can inspect runtime metadata and issue simple commands. We must, however, design the abstraction so that actor-based stacks like Firefox RDP and its Servo/Ladybird derivatives can plug in without redesigning the public API.

**User Story**: As a developer using the Effect Native toolkit, I want a `Debug` service that lets me attach to any supported JavaScript runtime via its debugger protocol so that I can drive the runtime from Effect programs (e.g., evaluate code, inspect targets, automate debugging tasks) without writing protocol-specific plumbing.

## Core Requirements (EARS)
- [Ubiquitous] When an Effect program requests a debugger connection, the system shall expose a `Debug` service interface that is independent of any specific debugger protocol.
- [Event-Driven] When given a Chrome DevTools Protocol WebSocket endpoint, the system shall establish a CDP session and expose a minimal command API for sending typed requests and receiving structured responses.
- [State-Driven] While a debug session is active, the system shall maintain connection state (targets, session id, capabilities) in Effect-safe data structures so that multiple commands can be issued sequentially.
- [Mode-Driven] When interacting with actor-based protocols (Firefox RDP, Servo, Ladybird), the system shall support request/response sequencing semantics (actor ids, watcher lifecycle) so protocol implementations can honour in-order replies and streamed events.
- [Optional] When alternative protocols (Firefox RDP, WebKit Inspector, etc.) become available, the system shall allow additional implementations to be registered without modifying existing consumer code.

## Technical Specifications
- Define a new `Debug` Effect Service interface with capability-based operations (`connect`, `disconnect`, `sendCommand`, `subscribe` for events) returning typed Effects.
- Represent messages with protocol-agnostic envelopes (`command`, `params`, `session`, `target`, `transport`) so that backends can translate to CDP method strings or RDP actor packets.
- Provide a CDP implementation that can attach to a Chromium instance exposed via `--remote-debugging-port` or Chrome DevTools remote interface (WebSocket URL) and drive commands such as `Browser.getVersion`.
- Document an RDP-oriented adapter shape that captures length-prefixed framing and watcher/actor lifecycle so future work can reuse the same service surface when integrating Firefox/Servo/Ladybird research.
- Use Effect-managed transports (`WebSocket`, length-prefixed TCP streams) with scoped resources that implement automatic cleanup on disconnect or failure.
- Place public interfaces in `packages/debug/src/Debug.ts` (following `.patterns/module-organization.md`), keep protocol-specific wiring under `packages/debug/src/internal`.
- Follow `.patterns/effect-library-development.md` for `Effect.gen` structure and `return yield*` semantics.
- Avoid type assertions; rely on schema-based validation where possible.

## Acceptance Criteria (mirrors EARS requirements)
- [AC-U1] A consumer can access the `Debug` service via Effect Layer injection without referencing protocol-specific classes.
- [AC-E1] Given a valid CDP WebSocket endpoint, calling `Debug.connect` followed by `Debug.sendCommand("Browser.getVersion")` returns the parsed browser version payload from a local Chrome instance.
- [AC-S1] While issuing multiple commands over the same session, connection state is retained and commands execute sequentially without crashing.
- [AC-M1] Protocol implementations can surface actor/watcher metadata (e.g., Firefox RDP descriptors) through the same `Debug` interface without API changes, demonstrated by an adapter design and unit guards.
- [AC-O1] Protocol implementations are injected via Layers so additional protocols can be added with new Layers and the core service does not need modifications.

## Out of Scope
- Full protocol coverage for CDP (only minimal command support required for prototype).
- Implementations for Firefox, WebKit, or React Native at this stage (design must allow them later).
- Browser automation features beyond sending raw commands (no high-level DOM automation yet).
- GUI or CLI tooling that drives the service (focus on programmatic API).

## Success Metrics
- [SM-U1] 100% of example usage imports the protocol-agnostic `Debug` service (validates AC-U1).
- [SM-E1] Demo program successfully prints Chrome version info via `Debug.sendCommand` on the target machine (validates AC-E1).
- [SM-S1] Integration test runs at least two sequential CDP commands over one session without reconnection (validates AC-S1).
- [SM-M1] Design documentation includes transport notes for actor-based protocols and is exercised by at least one unit-level guard or schema that references watcher/actor metadata (validates AC-M1).
- [SM-O1] Additional protocol implementation can be added by providing a new Layer without touching existing consumer tests (validates AC-O1).

## Future Considerations
- Extend schema-based validation for specific protocol domains (Debugger, Runtime, Page, etc.).
- Provide higher-level abstractions (e.g., `evaluate`, breakpoint management) built atop raw command interface.
- Explore persistent connection pooling and multiplexing for multiple runtimes.
- Implement actor-based adapters for Firefox, Servo, and Ladybird using the documented watcher lifecycle.
- Investigate bridging into React Native Hermes targets once protocol research completes.

## Testing Requirements
- Use `@effect/vitest` with `it.effect` to cover service behaviors (`.patterns/testing-patterns.md`).
- Provide a CDP integration test that spins up or attaches to a local Chrome instance with remote debugging enabled, using TestClock only if timing-sensitive operations are introduced.
- Ensure tests fail loudly if Chrome CDP is unavailable (per Hard-Fail policy) and document the steps for enabling Chrome’s remote debugging port.
- Validate minimal request/response schema using Effect Schema or runtime guards to catch protocol mismatches, including actor id sequencing rules for future RDP implementations.

