# @effect-native/crsql-mesh-runtime-react-native-op-sqlite — Instructions

## Context

The CR-SQLite mesh sync engine (`@effect-native/crsql-mesh`) is platform-agnostic. It requires runtime adapters to provide persistence coordination and lifecycle management for each target platform.

React Native apps on iOS and Android use native SQLite bindings, not WASM. The `op-sqlite` library (https://github.com/OP-Engineering/op-sqlite) is a high-performance React Native SQLite binding that supports loading native extensions. This package provides the runtime adapter for React Native apps using `op-sqlite`.

**Extension loading assumption**: `op-sqlite` loads the CR-SQLite extension as a **native shared library** (`.dylib` on iOS, `.so` on Android) at runtime. This is not WASM. The extension binary is bundled with the app and loaded via `op-sqlite`'s extension loading API.

## User Story

**As a** React Native developer building a local-first app with Effect,

**I want** a runtime adapter that integrates CR-SQLite mesh with `op-sqlite`,

**So that** I can add peer-to-peer database sync to my React Native app without implementing platform-specific coordination logic myself.

## High-Level Goals

- Provide a runtime adapter that wires `op-sqlite` into the mesh sync engine
- Handle React Native app lifecycle (foreground, background, termination)
- Coordinate database access within the app process
- Support iOS and Android platforms via `op-sqlite`'s cross-platform API

## Out of Scope

- **Electron**: Explicitly excluded. This package targets React Native only.
- **WASM-based SQLite**: This adapter uses native SQLite bindings via `op-sqlite`, not WASM.
- **expo-sqlite integration**: That is a separate package (`@effect-native/crsql-mesh-runtime-react-native-expo-sqlite`).
- **Transport implementations**: Network transports are separate packages.
- **The sync engine itself**: Lives in `@effect-native/crsql-mesh`.
- **Cross-app sync**: iOS App Groups and Android shared storage are deferred to future work.
- **Background sync scheduling**: BackgroundFetch/WorkManager integration is deferred.
- **Battery and network-aware sync**: Deferred to future work.

## References

- Parent package map: [`../crsqlite-global-mesh-packages/instructions.md`](../crsqlite-global-mesh-packages/instructions.md)
- Generic runtime spec: [`../crsql-mesh-runtime/instructions.md`](../crsql-mesh-runtime/instructions.md)
- op-sqlite: https://github.com/OP-Engineering/op-sqlite
