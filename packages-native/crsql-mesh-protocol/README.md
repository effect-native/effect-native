# @effect-native/crsql-mesh-protocol

Transport-agnostic message vocabulary for CR-SQLite mesh synchronization.

## Overview

This package defines the shared language that all mesh participants speak,
regardless of what runtime they execute on or what transport they use to
communicate. It provides:

- Message schemas for version summaries, diff requests, and diff responses
- A protocol layer with unhex() capability checking
- Encode/decode helpers with typed error handling

## Installation

```bash
npm install @effect-native/crsql-mesh-protocol
# or
pnpm add @effect-native/crsql-mesh-protocol
```

## Usage

```typescript
import * as Messages from "@effect-native/crsql-mesh-protocol/Messages"
import * as Protocol from "@effect-native/crsql-mesh-protocol/Protocol"
import { Effect, Schema as S } from "effect"

// Decode an incoming message
const program = Effect.gen(function*() {
  const rawMessage = {
    kind: "VersionSummary",
    seq: 1,
    sender: "AABBCCDD11223344556677889900EEFF",
    payload: {
      localSiteId: "AABBCCDD11223344556677889900EEFF",
      peers: {}
    }
  }
  const message = yield* Messages.decodeMeshMessage(rawMessage)
  // Handle the message...
})
```

## Message Types

- **VersionSummary**: Compact statement of what data versions a peer has seen
- **DiffRequest**: Request for missing changes based on version summary
- **DiffResponse**: Response containing missing change rows
- **MeshMessage**: Protocol message envelope with metadata

## License

MIT
