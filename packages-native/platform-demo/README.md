# @effect-native/platform-demo

Portable demonstrations and examples for @effect/platform that work across different runtime environments.

## Overview

This package provides comprehensive, executable documentation for @effect/platform features. All demos are platform-agnostic and can run on Node.js, Bun, browsers, and React Native with the appropriate platform layer.

## Installation

```bash
npm install @effect-native/platform-demo
# or
yarn add @effect-native/platform-demo
# or
pnpm add @effect-native/platform-demo
```

## Usage

### With Node.js

```typescript
import * as FileSystemDemo from "@effect-native/platform-demo/FileSystemDemo"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

// Run FileSystem demos with Node.js implementation
Effect.provide(
  FileSystemDemo.runAllDemos,
  NodeFileSystem.layer
).pipe(Effect.runPromise)
```

### With Expo/React Native

```typescript
import * as FileSystemDemo from "@effect-native/platform-demo/FileSystemDemo"
import * as ExpoFileSystem from "@effect-native/platform-expo/ExpoFileSystem"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

// Run FileSystem demos with Expo implementation
Effect.provide(
  FileSystemDemo.runAllDemos,
  ExpoFileSystem.layerDocument
).pipe(Effect.runPromise)
```

## Available Demos

### FileSystemDemo
- **basicOperations**: File reading, writing, and stats
- **directoryOperations**: Directory creation and listing
- **streamOperations**: Streaming file I/O
- **fileOperations**: Copy, move, rename, delete
- **watchOperations**: File system watching
- **errorHandling**: Graceful error recovery

### HttpClientDemo
- **basicRequests**: GET, POST, and other HTTP methods
- **headerManipulation**: Custom headers and response headers
- **clientConfiguration**: Base URLs, filtering, retries
- **streamingResponses**: Processing large responses
- **errorHandling**: Network errors, timeouts, status codes
- **schemaValidation**: Request/response validation
- **interceptors**: Request/response interceptors

### HttpServerDemo
- **basicRouting**: Route definitions and parameters
- **middlewareDemo**: Auth, CORS, logging middleware
- **streamingDemo**: Server-sent events, streaming responses
- **errorHandlingDemo**: HTTP error responses
- **fileUploadDemo**: Form data and multipart uploads
- **routerComposition**: Nested routers and mounting
- **cookiesAndHeaders**: Cookie and header management

### KeyValueStoreDemo
- **basicOperations**: Get, set, remove operations
- **batchOperations**: Bulk operations and clearing
- **complexDataTypes**: JSON, arrays, binary data
- **namespacedOperations**: Organizing data with namespaces
- **errorHandling**: Safe operations and fallbacks
- **performancePatterns**: Bulk operations and conditional updates

### TerminalDemo
- **basicInput**: Reading user input
- **coloredOutput**: ANSI colors and styles
- **interactiveMenu**: Menu-driven interfaces
- **progressIndicator**: Progress bars and spinners
- **formInput**: Collecting structured data
- **tableDisplay**: Formatted table output
- **streamingOutput**: Live log streaming
- **clearAndPosition**: Terminal control sequences

### SocketDemo
- **clientConnection**: WebSocket connections
- **bidirectionalChat**: Two-way communication
- **streamingData**: Streaming over sockets
- **reconnection**: Connection recovery
- **errorHandling**: Connection and send errors
- **binaryData**: Binary data transfer
- **multiplexing**: Multi-channel communication
- **queuedMessages**: Message queue patterns

### PathDemo
- **basicOperations**: Join, normalize, resolve paths
- **pathParsing**: Extract components from paths
- **pathChecks**: Absolute paths, separators
- **crossPlatform**: Platform-specific handling
- **pathManipulation**: Modify extensions and names
- **pathPatterns**: Common path use cases
- **pathComparison**: Compare and validate paths

### CommandDemo
- **basicExecution**: Running commands with arguments
- **streamingOutput**: Processing command output
- **environmentVariables**: Setting and clearing env
- **workingDirectory**: Change working directory
- **standardStreams**: stdin, stdout, stderr
- **errorHandling**: Exit codes and timeouts
- **processControl**: Signals and exit codes
- **complexScripts**: Multi-line shell scripts

## Running Individual Demos

Each demo module exports individual demo functions that can be run separately:

```typescript
import * as HttpClientDemo from "@effect-native/platform-demo/HttpClientDemo"
import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient"
import * as Effect from "effect/Effect"

// Run just the basic requests demo
Effect.provide(
  HttpClientDemo.basicRequests,
  NodeHttpClient.layer
).pipe(Effect.runPromise)
```

## Platform Compatibility

| Demo | Node.js | Bun | Browser | React Native |
|------|---------|-----|---------|--------------|
| FileSystem | ✅ | ✅ | ⚠️ | ✅ |
| HttpClient | ✅ | ✅ | ✅ | ✅ |
| HttpServer | ✅ | ✅ | ⚠️ | ⚠️ |
| KeyValueStore | ✅ | ✅ | ✅ | ✅ |
| Terminal | ✅ | ✅ | ❌ | ❌ |
| Socket | ✅ | ✅ | ✅ | ✅ |
| Path | ✅ | ✅ | ✅ | ✅ |
| Command | ✅ | ✅ | ❌ | ❌ |

Legend:
- ✅ Full support
- ⚠️ Partial support (some features may not work)
- ❌ Not supported

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Generate documentation
pnpm docgen
```

## License

MIT