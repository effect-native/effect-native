# @effect-native/persistence-secrets Requirements

## Functional Requirements

### FR-1: Layer Construction

**FR-1.1** The package shall export a `layerBunSecrets` layer that provides `BackingPersistence`.

**FR-1.2** The package shall export a `layerBunSecretsResult` layer that provides `ResultPersistence` using the `layerBunSecrets` backing.

### FR-2: Store Creation

**FR-2.1** When `BackingPersistence.make(storeId)` is called,  
**Then** the system shall return a `BackingPersistenceStore` scoped to that `storeId`.

**FR-2.2** The system shall use the `storeId` as the keychain service identifier for all secrets in that store.

### FR-3: Get Operations

**FR-3.1** When `store.get(key)` is called with a key that exists in the keychain,  
**Then** the system shall return `Option.some` containing the JSON-parsed value.

**FR-3.2** When `store.get(key)` is called with a key that does not exist in the keychain,  
**Then** the system shall return `Option.none`.

**FR-3.3** When `store.getMany(keys)` is called,  
**Then** the system shall return an array of `Option` values in the same order as the input keys.

**FR-3.4** When `store.get(key)` retrieves a value that cannot be parsed as JSON,  
**Then** the system shall return a `PersistenceBackingError` with method "get".

### FR-4: Set Operations

**FR-4.1** When `store.set(key, value, ttl)` is called,  
**Then** the system shall JSON-stringify the value and store it in the keychain under `storeId/key`.

**FR-4.2** The `ttl` parameter shall be accepted but ignored (keychain does not support expiration).

**FR-4.3** When `store.setMany(entries)` is called,  
**Then** the system shall store each entry sequentially (no batch API available).

**FR-4.4** When `store.set(key, value, ttl)` fails due to keychain access error,  
**Then** the system shall return a `PersistenceBackingError` with method "set".

### FR-5: Remove Operations

**FR-5.1** When `store.remove(key)` is called with a key that exists,  
**Then** the system shall delete the secret from the keychain.

**FR-5.2** When `store.remove(key)` is called with a key that does not exist,  
**Then** the system shall succeed without error.

### FR-6: Clear Operation

**FR-6.1** When `store.clear` is called,  
**Then** the system shall return a `PersistenceBackingError` with method "clear" and a descriptive cause.

**Rationale:** Bun.secrets provides no enumeration API, making it impossible to discover and delete all keys for a given storeId. Callers must track their own keys if bulk deletion is required.

### FR-7: Key Naming

**FR-7.1** The system shall construct keychain secret names using the pattern `{storeId}/{key}`.

**FR-7.2** The system shall use `storeId` as the service name parameter for `Bun.secrets` operations.

### FR-8: Testing Support

**FR-8.1** The package shall export a `layerTest` layer that provides an in-memory `BackingPersistence` for unit testing.

**FR-8.2** The `layerTest` layer shall have identical behavior to `layerBunSecrets` except for actual keychain access.

## Non-Functional Requirements

### NFR-1: Runtime Dependency

**NFR-1.1** The `layerBunSecrets` layer shall require Bun runtime.

**NFR-1.2** When running outside Bun runtime, importing `layerBunSecrets` shall fail with a clear error message indicating Bun is required.

### NFR-2: Error Handling

**NFR-2.1** All keychain errors shall be wrapped in `PersistenceBackingError` with the appropriate method name.

**NFR-2.2** Error messages shall preserve the original error cause for debugging.

### NFR-3: Data Format

**NFR-3.1** All values shall be stored as JSON strings (Bun.secrets is string-only).

**NFR-3.2** Values that cannot be JSON-serialized shall result in a `PersistenceBackingError`.

### NFR-4: Effect Patterns

**NFR-4.1** All public exports shall include JSDoc with `@since` and `@category` tags.

**NFR-4.2** The package shall follow Effect's TypeId pattern for service identification.

**NFR-4.3** The package shall use `Context.GenericTag` for service tags.

## Constraints

### C-1: API Limitations

**C-1.1** The implementation shall not provide TTL-based expiration (keychain limitation).

**C-1.2** The implementation shall not provide batch operations optimization (no keychain batch API).

**C-1.3** The implementation shall not support binary data (Bun.secrets is string-only).

### C-2: Platform Support

**C-2.1** The implementation shall support macOS Keychain, Linux libsecret, and Windows Credential Manager (via Bun.secrets abstraction).

**C-2.2** Platform-specific behavior shall be delegated entirely to Bun.secrets.
