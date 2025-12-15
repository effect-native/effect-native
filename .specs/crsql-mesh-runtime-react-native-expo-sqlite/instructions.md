# @effect-native/crsql-mesh-runtime-react-native-expo-sqlite — Instructions

## Context

The CR-SQLite mesh sync engine (`@effect-native/crsql-mesh`) is platform-agnostic. It requires runtime adapters to provide persistence coordination and lifecycle management for each target platform.

React Native apps on iOS and Android use native SQLite bindings, not WASM. As of Expo SDK 54 (2025-09-10), `expo-sqlite` added `loadExtensionAsync()` / `loadExtensionSync()` APIs that allow loading custom native extensions by path. This package provides the runtime adapter for React Native apps using `expo-sqlite`.

**Extension loading assumption**: `expo-sqlite` loads the CR-SQLite extension as a **native shared library** (`.dylib` on iOS, `.so` on Android) at runtime. This is not WASM. The extension binary is bundled with the app and loaded via `expo-sqlite`'s `loadExtensionAsync()` or `loadExtensionSync()` API.

## User Story

**As a** React Native developer building a local-first Expo app with Effect,

**I want** a runtime adapter that integrates CR-SQLite mesh with `expo-sqlite`,

**So that** I can add peer-to-peer database sync to my Expo app without implementing platform-specific coordination logic myself.

## High-Level Goals

- Provide a runtime adapter that wires `expo-sqlite` into the mesh sync engine
- Handle React Native app lifecycle (foreground, background, termination)
- Coordinate database access within the app process
- Support iOS and Android platforms via `expo-sqlite`'s cross-platform API
- Require Expo SDK 54+ for extension loading support

## Out of Scope

- **Electron**: Explicitly excluded. This package targets React Native (Expo) only.
- **WASM-based SQLite**: This adapter uses native SQLite bindings via `expo-sqlite`, not WASM.
- **op-sqlite integration**: That is a separate package (`@effect-native/crsql-mesh-runtime-react-native-op-sqlite`).
- **Expo SDK versions before 54**: Extension loading requires SDK 54+.
- **Transport implementations**: Network transports are separate packages.
- **The sync engine itself**: Lives in `@effect-native/crsql-mesh`.
- **Cross-app sync**: iOS App Groups and Android shared storage are deferred to future work.
- **Background sync scheduling**: BackgroundFetch/WorkManager integration is deferred.
- **Battery and network-aware sync**: Deferred to future work.

## References

- Parent package map: [`../crsqlite-global-mesh-packages/instructions.md`](../crsqlite-global-mesh-packages/instructions.md)
- Generic runtime spec: [`../crsql-mesh-runtime/instructions.md`](../crsql-mesh-runtime/instructions.md)
- expo-sqlite docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
