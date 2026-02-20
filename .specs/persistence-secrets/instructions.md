# @effect-native/persistence-secrets Instructions

## Context

The `@effect/experimental` package provides a `Persistence` abstraction with `BackingPersistence` and `ResultPersistence` interfaces. These allow Effect programs to persist data with schema validation, TTL support, and proper error handling.

Existing backing implementations include:

- `layerMemory` - In-memory storage (testing)
- `layerKeyValueStore` - Backed by `@effect/platform` KeyValueStore (filesystem, localStorage, etc.)

However, there is no implementation for secure OS-native credential storage. Bun provides `Bun.secrets` which accesses:

- macOS: Keychain
- Linux: libsecret (GNOME Keyring, KWallet)
- Windows: Credential Manager

This is critical for CLI tools that need to cache sensitive credentials (API tokens, passwords) securely rather than in plaintext files.

The `npm-snipe` specification (see `/npm-snipe/npm-snipe.md`) demonstrates the need: caching npm registry tokens and passwords securely for automated publishing with 2FA.

## User Story

**As a** developer building CLI tools with Effect,
**I want** a Persistence backing that stores secrets in the OS keychain,
**So that** I can cache sensitive credentials securely without plaintext files.

## High-Level Goals

1. **Implement BackingPersistence for Bun.secrets**
   - Provide `layerBunSecrets` layer
   - Support get/set/remove/clear operations
   - Map storeId + key to service/name in keychain

2. **Handle Bun.secrets API constraints**
   - Secrets are string-only (no binary)
   - Service identifier required for each secret
   - No enumeration API (cannot list all secrets)

3. **Provide proper error handling**
   - Map Bun.secrets failures to PersistenceBackingError
   - Handle "not found" vs actual errors

4. **Support testing**
   - Mock layer for unit tests
   - Works without actual keychain access

5. **Follow Effect patterns**
   - TypeId pattern for services
   - Layer-based dependency injection
   - JSDoc with @since and @category tags

## Out of Scope

### For v1.0

- **TTL support** - Keychain doesn't support expiration; TTL will be ignored or handled by caller
- **Batch operations optimization** - getMany/setMany will be sequential (no batch keychain API)
- **Binary data** - Bun.secrets is string-only
- **Cross-platform fallback** - Requires Bun runtime

### Permanently Out of Scope

- **Custom encryption** - OS provides encryption
- **Key rotation** - Application concern
- **Access control** - OS manages permissions
- **Keychain synchronization** - iCloud Keychain is transparent
