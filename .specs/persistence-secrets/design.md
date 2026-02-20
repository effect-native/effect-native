# @effect-native/persistence-secrets Design

## Overview

This document specifies the technical architecture for implementing a BackingPersistence that uses OS-native secure credential storage through the Bun.secrets API.

---

## Data Models

### SecretsPersistence

A service implementing the BackingPersistence interface with:

- TypeId: A unique symbol for the service identity
- make: Factory function accepting a store identifier, returning a scoped store

### SecretsStore

The backing store implementation with fields:

- storeId: String identifier used to namespace keys in the keychain
- get, getMany, set, setMany, remove, clear: Operations matching BackingPersistenceStore

### Interface Compliance

The package implements the standard BackingPersistence interface from @effect/experimental:

- get returns `Option.Option<unknown>`
- set accepts `value: unknown`
- This matches the existing layerMemory and layerKeyValueStore implementations

### SecretsPersistence (Higher-Level API)

In addition to the raw BackingPersistence implementation, the package provides a secrets-aware API:

- SecretsPersistence wraps BackingPersistence with Redacted semantics
- get operations return `Option.Option<Redacted<A>>`
- set operations accept `Redacted<A>` values
- This layer automatically wraps/unwraps Redacted to prevent accidental secret leakage

Callers choose which API to use:

- Use BackingPersistence directly for compatibility with ResultPersistence (schema-based)
- Use SecretsPersistence for direct secret storage with Redacted protection

### Supported Value Types

Values stored can be any JSON-serializable type:

- Strings (simple passwords, tokens)
- Objects (complex credentials with multiple fields, OAuth tokens with metadata)
- Arrays, numbers, booleans, null

The serialization layer handles JSON encoding/decoding transparently.

### KeyNamespace

Internal model for constructing keychain identifiers:

- service: The store identifier (e.g., "npmjs.com")
- account: The key name within the store (e.g. "thomasaylott")

The combination of service and account forms a unique identifier in the OS keychain. This maps to Bun.secrets which uses "service" and "name" parameters.

---

## API Signatures

### Primary Layers

| Export          | Type                               | Description                                      |
| --------------- | ---------------------------------- | ------------------------------------------------ |
| layerBunSecrets | Layer providing BackingPersistence | Creates backing persistence using Bun.secrets    |
| layerInMemory   | Layer providing BackingPersistence | In-memory implementation without keychain access |

### Secrets-Aware API

| Export                  | Type                               | Description                                     |
| ----------------------- | ---------------------------------- | ----------------------------------------------- |
| SecretsPersistence      | Service tag                        | Higher-level API with Redacted semantics        |
| layerSecretsPersistence | Layer providing SecretsPersistence | Wraps BackingPersistence with Redacted handling |

The SecretsPersistence service provides:

- get: returns `Effect<Option<Redacted<A>>, PersistenceError>`
- set: accepts `Redacted<A>` values
- Internally unwraps Redacted before storage and wraps on retrieval

### Internal Functions

| Function         | Inputs           | Output                                  | Description                                                         |
| ---------------- | ---------------- | --------------------------------------- | ------------------------------------------------------------------- |
| makeStore        | storeId (string) | Effect yielding BackingPersistenceStore | Creates a scoped store for the given identifier                     |
| makeSecretKey    | storeId, key     | string                                  | Combines store ID and key into a keychain service name              |
| serializeValue   | unknown          | string                                  | JSON-serializes any value (string, object, array, etc.) for storage |
| deserializeValue | string           | unknown                                 | JSON-parses a stored string back to its original type               |

---

## Module Architecture

### Package Structure

The package lives at packages/persistence-secrets with the following organization:

- src/index.ts: Public exports (layer functions, error types if any custom)
- src/internal/bunSecrets.ts: Bun.secrets implementation
- src/internal/memory.ts: Test/mock implementation
- src/internal/keyNamespace.ts: Key construction logic

### Dependency Relationships

External dependencies:

- effect: Core library (Effect, Layer, Option, Context)
- @effect/experimental: Persistence interfaces (BackingPersistence, BackingPersistenceStore, PersistenceBackingError)

Runtime dependencies:

- Bun runtime (for Bun.secrets API)

The package has no dependencies on other @effect-native packages.

### Key Construction Strategy

To prevent key collisions and maintain store isolation:

1. The storeId becomes the "service" parameter in Bun.secrets
2. The key becomes the "name" (or "account") parameter
3. This naturally provides the isolation required by FR-5.1

For example, store "npmjs.com" with key "token" maps to service="npmjs.com", name="token" in the keychain.

---

## Algorithms

### Get Operation (BackingPersistence)

1. Receive key string from caller
2. Construct keychain identifier from storeId and key
3. Call Bun.secrets.get with service and name
4. If null returned, yield Option.none
5. If string returned, deserialize JSON
6. Yield Option.some with the deserialized value (unknown type per interface)
7. If error thrown, wrap in PersistenceBackingError and fail

### Set Operation (BackingPersistence)

1. Receive key, value (unknown), and optional TTL from caller
2. If TTL is provided, emit warning that TTL is not supported
3. Serialize the value to JSON string (handles objects, arrays, primitives)
4. Construct keychain identifier from storeId and key
5. Call Bun.secrets.set with service, name, and serialized value
6. If error thrown, wrap in PersistenceBackingError and fail (without exposing the value)

### Get Operation (SecretsPersistence)

1. Delegate to underlying BackingPersistence get
2. If Option.none, return Option.none
3. If Option.some, wrap the value in Redacted.make
4. Return Option.some with Redacted value

### Set Operation (SecretsPersistence)

1. Receive key and Redacted value from caller
2. Unwrap the Redacted value using Redacted.value
3. Delegate to underlying BackingPersistence set with unwrapped value

### GetMany Operation

1. Receive array of keys
2. Map over keys sequentially (no batch API available)
3. For each key, perform the Get operation
4. Collect results preserving order
5. Return array of Option values matching input order

### SetMany Operation

1. Receive array of key-value-ttl tuples
2. Map over entries sequentially
3. For each entry, perform the Set operation
4. If any operation fails, fail the entire batch

### Remove Operation

1. Receive key string
2. Construct keychain identifier from storeId and key
3. Call Bun.secrets.delete with service and name
4. Succeed regardless of whether key existed (idempotent)
5. If unexpected error thrown, wrap in PersistenceBackingError

### Clear Operation

1. The OS keychain does not support enumerating secrets by service
2. This operation must fail with PersistenceBackingError
3. Error message explains the limitation and suggests removing keys individually
4. This satisfies FR-4.1 which requires failure with explanation

---

## Error Handling Strategy

### Error Categories

| Category               | Cause                        | Response                                                |
| ---------------------- | ---------------------------- | ------------------------------------------------------- |
| KeyNotFound            | Bun.secrets.get returns null | Return Option.none (not an error)                       |
| SerializationFailure   | JSON.stringify throws        | Wrap in PersistenceBackingError with method "set"       |
| DeserializationFailure | JSON.parse throws            | Wrap in PersistenceBackingError with method "get"       |
| KeychainAccessDenied   | OS denies access             | Wrap in PersistenceBackingError with descriptive cause  |
| ClearUnsupported       | clear called                 | Fail with PersistenceBackingError explaining limitation |
| UnknownError           | Any other Bun.secrets error  | Wrap in PersistenceBackingError preserving cause        |

### Error Construction

All errors use PersistenceBackingError.make from @effect/experimental:

- First argument: method name (get, set, remove, clear, getMany, setMany)
- Second argument: underlying cause (original error or descriptive object)

### Security in Errors

Per NFR-1.3 through NFR-1.5:

- Never include secret values in error messages
- Never include secret values in the cause chain
- Redact any accidental secret exposure before constructing errors
- Error causes should contain key names but never values

### Redacted Values (SecretsPersistence API)

The SecretsPersistence API provides Redacted semantics on top of BackingPersistence:

- Redacted values automatically display as "<redacted>" when logged or stringified
- Callers must explicitly call Redacted.value(secret) to access the underlying value
- This makes secret leakage in logs and errors structurally impossible
- The Redacted wrapper is a zero-cost abstraction at runtime once unwrapped

Note: The raw BackingPersistence interface returns `unknown` per the @effect/experimental contract. Use SecretsPersistence when you want automatic Redacted wrapping.

### Call-to-Action Messages

Per NFR-1.9, errors include actionable guidance:

| Error                  | Call-to-Action                                                               |
| ---------------------- | ---------------------------------------------------------------------------- |
| Keychain access denied | "Grant keychain access in System Settings > Privacy & Security"              |
| Clear unsupported      | "Remove secrets individually using remove() as enumeration is not supported" |
| Serialization failure  | "Ensure the value is JSON-serializable"                                      |

---

## Test Strategy

### Unit Tests

| Test Area                          | What to Verify                                               |
| ---------------------------------- | ------------------------------------------------------------ |
| Key namespace construction         | Store ID and key combine correctly into keychain identifiers |
| Serialization round-trip           | Values survive JSON encode/decode (strings, objects, arrays) |
| Complex object storage             | JSON objects with nested fields store and retrieve correctly |
| Option handling                    | None returned for missing keys, Some for existing            |
| Error wrapping                     | All error types produce correct PersistenceBackingError      |
| TTL warning                        | Set operation with TTL emits warning and proceeds            |
| Batch ordering                     | getMany returns results in same order as input keys          |
| BackingPersistence interface       | Conforms to @effect/experimental BackingPersistence contract |
| SecretsPersistence Redacted input  | SecretsPersistence.set accepts Redacted-wrapped values       |
| SecretsPersistence Redacted output | SecretsPersistence.get returns Redacted-wrapped values       |
| Redacted display                   | Redacted values display as "<redacted>" when stringified     |
| Redacted unwrap                    | Redacted.value reveals the actual secret value               |
| ResultPersistence compatibility    | Can be used with layerResult for schema-based persistence    |

Unit tests use the layerInMemory (in-memory) implementation to run without keychain access.

### Integration Tests

| Test Area               | What to Verify                                                  |
| ----------------------- | --------------------------------------------------------------- |
| Actual keychain storage | Values persist across get/set operations using real Bun.secrets |
| Store isolation         | Different storeIds do not see each other's keys                 |
| Remove idempotency      | Removing non-existent key succeeds                              |
| Clear failure           | clear operation fails with appropriate error                    |

Integration tests require:

- Bun runtime
- User interaction to grant keychain access on first run (macOS)
- Skip flag for CI environments without keychain

### Test Implementation Notes

All tests written using @effect/vitest or similar Effect-aware test harness. Tests should use Effect.gen for clarity and leverage Effect.provide to inject the appropriate layer (test vs real).

---

## Security Considerations

### Pit of Success (NFR-1.6)

The API makes secure behavior automatic:

- No configuration needed for encryption (OS provides it)
- Default layer uses real keychain (test layer must be explicitly chosen)
- No plaintext fallback option
- SecretsPersistence API returns Redacted by default, requiring explicit unwrap to use
- BackingPersistence API available for ResultPersistence/Schema integration

### Fail Closed (NFR-1.7)

When uncertain:

- If Bun.secrets API is unavailable, fail rather than fall back
- If keychain access is denied, fail rather than store in plaintext
- If value cannot be serialized, fail rather than truncate

### Fail Secure (NFR-1.8)

On failure:

- No partial writes (set either completes or fails atomically)
- No secret leakage in logs or errors
- Clear failures do not affect stored secrets

---

## Package Configuration

The package.json will specify:

- Name: @effect-native/persistence-secrets
- Peer dependencies: effect, @effect/experimental
- Engines: Bun (required for Bun.secrets API)
- Exports: Main entry point at src/index.ts
- Side effects: None declared

The tsconfig extends the monorepo base configuration.
