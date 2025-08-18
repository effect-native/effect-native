# @effect-native/platform-expo

Platform-specific implementations for React Native/Expo applications using Effect.

This package provides Effect platform implementations for:
- FileSystem using expo-file-system/next
- KeyValueStore using AsyncStorage and SecureStore
- HTTP client, streams, and other platform services

## Installation

```bash
npm install @effect-native/platform-expo
```

## Features

- **FileSystem**: Complete file system operations using expo-file-system/next
- **KeyValueStore**: Two layers - AsyncStorage for general storage, SecureStore for sensitive data
- **Runtime**: Pre-configured runtime with all platform services
- **HTTP Client**: Fetch-based HTTP client implementation
- **Streams**: Stream utilities adapted for React Native

## Usage

```typescript
import { ExpoRuntime, ExpoFileSystem } from "@effect-native/platform-expo"
import { Effect } from "effect"

// Use the pre-configured runtime
ExpoRuntime.runMain(
  Effect.gen(function* () {
    // Your Effect code here
  })
)
```