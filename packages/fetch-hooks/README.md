# @effect-native/fetch-hooks

Fetch caching utilities for deterministic API replay in development and testing.

## Overview

This package provides utilities for recording and replaying fetch requests, enabling:

- **Deterministic test runs** - Replay cached responses instead of making real API calls
- **Faster development** - Avoid network latency during development
- **Offline development** - Work without network connectivity
- **Replay for testing** - Deterministically test API integrations

## Features

- **Request caching** - Record fetch requests and cache responses
- **Binary response handling** - Support for binary/blob responses
- **Custom headers** - Handle request-specific headers
- **Server-sent events** - SSE stream replay support
- **Filesystem storage** - Persistent cache storage
- **Environment-aware** - Detects Bun/Node.js runtime

## Usage

See test files for usage examples:

- `binary-extractor.test.ts` - Binary response handling
- `cache-manager.test.ts` - Cache management
- `filesystem-storage.test.ts` - File storage operations
- `request-hasher.test.ts` - Request hashing
- `sse-handler.test.ts` - SSE stream handling

## License

MIT
