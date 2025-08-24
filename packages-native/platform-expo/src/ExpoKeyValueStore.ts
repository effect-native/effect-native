/**
 * @since 1.0.0
 */
import * as PlatformError from "@effect/platform/Error"
import * as KeyValueStore from "@effect/platform/KeyValueStore"
import AsyncStorageImport from "@react-native-async-storage/async-storage"

const AsyncStorage = AsyncStorageImport as any as {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
  clear: () => Promise<void>
  getAllKeys: () => Promise<string[]>
}
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as SecureStore from "expo-secure-store"

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeAsyncStorage = (): KeyValueStore.KeyValueStore =>
  KeyValueStore.makeStringOnly({
    get: (key: string) =>
      Effect.tryPromise({
        try: async () => {
          const value = await AsyncStorage.getItem(key)
          return value === null ? Option.none() : Option.some(value)
        },
        catch: (error) =>
          new PlatformError.SystemError({
            module: "KeyValueStore",
            method: "get",
            reason: "Unknown",
            pathOrDescriptor: key,
            cause: error instanceof Error ? error : undefined
          })
      }),
    set: (key: string, value: string) =>
      Effect.tryPromise({
        try: () => AsyncStorage.setItem(key, value),
        catch: (error) =>
          new PlatformError.SystemError({
            module: "KeyValueStore",
            method: "set",
            reason: "Unknown",
            pathOrDescriptor: key,
            cause: error instanceof Error ? error : undefined
          })
      }),
    remove: (key: string) =>
      Effect.tryPromise({
        try: () => AsyncStorage.removeItem(key),
        catch: (error) =>
          new PlatformError.SystemError({
            module: "KeyValueStore",
            method: "remove",
            reason: "Unknown",
            pathOrDescriptor: key,
            cause: error instanceof Error ? error : undefined
          })
      }),
    clear: Effect.tryPromise({
      try: () => AsyncStorage.clear(),
      catch: (error) =>
        new PlatformError.SystemError({
          module: "KeyValueStore",
          method: "clear",
          reason: "Unknown",
          pathOrDescriptor: "AsyncStorage",
          cause: error instanceof Error ? error : undefined
        })
    }),
    size: Effect.tryPromise({
      try: async () => {
        const keys = await AsyncStorage.getAllKeys()
        return keys.length
      },
      catch: (error) =>
        new PlatformError.SystemError({
          module: "KeyValueStore",
          method: "size",
          reason: "Unknown",
          pathOrDescriptor: "AsyncStorage",
          cause: error instanceof Error ? error : undefined
        })
    })
  })

/**
 * Helper function to create SecureStore errors with proper context
 */
const createSecureStoreError = (method: string, key: string, cause?: unknown): PlatformError.SystemError => {
  if (cause instanceof Error) {
    if (cause.message.includes("Item not found")) {
      return new PlatformError.SystemError({
        module: "KeyValueStore",
        method,
        reason: "NotFound",
        pathOrDescriptor: key
      })
    }
    if (cause.message.includes("size limit") || cause.message.includes("2048")) {
      return new PlatformError.SystemError({
        module: "KeyValueStore",
        method,
        reason: "InvalidData",
        pathOrDescriptor: key
      })
    }
  }

  return new PlatformError.SystemError({
    module: "KeyValueStore",
    method,
    reason: "Unknown",
    pathOrDescriptor: key,
    cause: cause instanceof Error ? cause : undefined
  })
}

/**
 * Helper to chunk large strings into smaller pieces
 */
const chunkString = (str: string, maxSize: number): Array<string> => {
  const chunks: Array<string> = []
  for (let i = 0; i < str.length; i += maxSize) {
    chunks.push(str.slice(i, i + maxSize))
  }
  return chunks
}

/**
 * SecureStore options for customizing behavior
 */
export interface SecureStoreOptions {
  readonly keyRegistry?: KeyValueStore.KeyValueStore
  readonly maxValueSize?: number
  readonly secureStoreOptions?: SecureStore.SecureStoreOptions
}

/**
 * Registry key for tracking SecureStore keys
 */
const REGISTRY_KEY = "__securestore_registry_v1__"

/**
 * Update the key registry when keys are added/removed
 */
const updateKeyRegistry = (
  registry: KeyValueStore.KeyValueStore,
  key: string,
  operation: "set" | "remove"
) =>
  Effect.gen(function*() {
    const currentKeys = yield* registry.get(REGISTRY_KEY)
    const keys = new Set<string>(Option.isSome(currentKeys) ? JSON.parse(currentKeys.value) : [])

    if (operation === "set") {
      keys.add(key)
    } else {
      keys.delete(key)
    }

    yield* registry.set(REGISTRY_KEY, JSON.stringify([...keys]))
  })

/**
 * Get all registered keys from the registry
 */
const getRegisteredKeys = (registry: KeyValueStore.KeyValueStore) =>
  Effect.gen(function*() {
    const keysJson = yield* registry.get(REGISTRY_KEY)
    return Option.isSome(keysJson) ? JSON.parse(keysJson.value) as Array<string> : []
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeSecureStore = (options: SecureStoreOptions = {}): KeyValueStore.KeyValueStore => {
  const registry = options.keyRegistry ?? makeAsyncStorage()
  const maxSize = options.maxValueSize ?? 1900 // Safe margin under 2KB limit
  const storeOptions = options.secureStoreOptions

  const get = (key: string): Effect.Effect<Option.Option<string>, PlatformError.PlatformError, never> =>
    Effect.gen(function*() {
      try {
        const value = yield* Effect.tryPromise({
          try: () => SecureStore.getItemAsync(key, storeOptions),
          catch: (error) => createSecureStoreError("get", key, error)
        })
        if (!value) return Option.none()

        // Handle chunked data
        if (value.startsWith("__chunked__")) {
          const metadata = JSON.parse(value.slice(11))
          const chunks = yield* Effect.all(
            Array.from({ length: metadata.totalChunks }, (_, i) =>
              Effect.tryPromise({
                try: () => SecureStore.getItemAsync(`${key}__chunk__${i}`, storeOptions),
                catch: (error) => createSecureStoreError("get", key, error)
              })
            ),
            { concurrency: 5 }
          )
          return Option.some(chunks.join(""))
        }

        return Option.some(value)
      } catch (error) {
        return yield* Effect.fail(createSecureStoreError("get", key, error))
      }
    })

  const remove = (key: string) =>
    Effect.gen(function*() {
      try {
        // Check if chunked
        const mainValue = yield* Effect.tryPromise({
          try: () => SecureStore.getItemAsync(key, storeOptions),
          catch: (error) => createSecureStoreError("get", key, error)
        })

        if (mainValue?.startsWith("__chunked__")) {
          const metadata = JSON.parse(mainValue.slice(11))
          yield* Effect.all(
            Array.from({ length: metadata.totalChunks }, (_, i) =>
              Effect.tryPromise({
                try: () => SecureStore.deleteItemAsync(`${key}__chunk__${i}`, storeOptions),
                catch: (error) => createSecureStoreError("remove", key, error)
              })
            ),
            { concurrency: 5 }
          )
        }

        yield* Effect.tryPromise({
          try: () => SecureStore.deleteItemAsync(key, storeOptions),
          catch: (error) => createSecureStoreError("remove", key, error)
        })
        yield* updateKeyRegistry(registry, key, "remove")
      } catch (error) {
        yield* Effect.fail(createSecureStoreError("remove", key, error))
      }
    })

  // Implement string-only storage and derive binary support via makeStringOnly
  const setString = (key: string, stringValue: string) =>
    Effect.gen(function*() {
      try {
        if (stringValue.length <= maxSize) {
          yield* Effect.tryPromise({
            try: () => SecureStore.setItemAsync(key, stringValue, storeOptions),
            catch: (error) => createSecureStoreError("set", key, error)
          })
        } else {
          const chunks = chunkString(stringValue, maxSize)
          const metadata = { totalChunks: chunks.length, type: "chunked" }
          yield* Effect.tryPromise({
            try: () => SecureStore.setItemAsync(key, `__chunked__${JSON.stringify(metadata)}`, storeOptions),
            catch: (error) => createSecureStoreError("set", key, error)
          })
          yield* Effect.all(
            chunks.map((chunk, i) => Effect.tryPromise({
              try: () => SecureStore.setItemAsync(`${key}__chunk__${i}`, chunk, storeOptions),
              catch: (error) => createSecureStoreError("set", key, error)
            })),
            { concurrency: 5 }
          )
        }
        yield* updateKeyRegistry(registry, key, "set")
      } catch (error) {
        yield* Effect.fail(createSecureStoreError("set", key, error))
      }
    })

  return KeyValueStore.makeStringOnly({
    get,
    set: setString,
    remove,
    clear: Effect.gen(function*() {
      const keys = yield* getRegisteredKeys(registry)
      yield* Effect.all(
        keys.map((key) => remove(key)),
        { concurrency: 10 }
      )
      yield* registry.clear
    }),
    size: Effect.gen(function*() {
      const keys = yield* getRegisteredKeys(registry)
      return keys.length
    })
  })
}

/**
 * Creates a KeyValueStore layer that uses React Native's AsyncStorage.
 * Values are stored persistently across app restarts.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerAsyncStorage: Layer.Layer<KeyValueStore.KeyValueStore> = Layer.succeed(
  KeyValueStore.KeyValueStore,
  makeAsyncStorage()
)

/**
 * Creates a KeyValueStore layer that uses Expo's SecureStore with enhanced capabilities.
 * Features:
 * - Values stored securely using the device's keychain/keystore
 * - Automatic chunking for values > 2KB (SecureStore limit)
 * - Full binary data support with Base64 encoding
 * - Key registry for enumeration operations (clear, size)
 * - Proper error handling with descriptive messages
 *
 * @since 1.0.0
 * @category layers
 */
export const layerSecureStore: Layer.Layer<KeyValueStore.KeyValueStore> = Layer.succeed(
  KeyValueStore.KeyValueStore,
  makeSecureStore()
)

/**
 * Creates a KeyValueStore layer that uses Expo's SecureStore with custom options.
 *
 * @param options Configuration options for SecureStore behavior
 * @since 1.0.0
 * @category layers
 */
export const layerSecureStoreWithOptions = (
  options: SecureStoreOptions
): Layer.Layer<KeyValueStore.KeyValueStore> =>
  Layer.succeed(
    KeyValueStore.KeyValueStore,
    makeSecureStore(options)
  )
