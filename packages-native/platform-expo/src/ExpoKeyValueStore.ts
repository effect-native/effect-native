/**
 * @since 1.0.0
 */
import type * as KeyValueStore from "@effect/platform/KeyValueStore"
import * as PlatformError from "@effect/platform/Error"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SecureStore from "expo-secure-store"

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeAsyncStorage = (): KeyValueStore.KeyValueStore =>
  KeyValueStore.make({
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

    getUint8Array: (key: string) =>
      Effect.tryPromise({
        try: async () => {
          const value = await AsyncStorage.getItem(key)
          if (value === null) return Option.none()
          try {
            const decoded = Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
            return Option.some(decoded)
          } catch {
            throw new Error("Invalid Base64 data")
          }
        },
        catch: (error) =>
          new PlatformError.SystemError({
            module: "KeyValueStore",
            method: "getUint8Array",
            reason: error instanceof Error && error.message === "Invalid Base64 data" ? "InvalidBase64" : "Unknown",
            pathOrDescriptor: key,
            cause: error instanceof Error ? error : undefined
          })
      }),

    set: (key: string, value: string | Uint8Array) =>
      Effect.tryPromise({
        try: async () => {
          let stringValue: string
          if (typeof value === "string") {
            stringValue = value
          } else {
            try {
              stringValue = btoa(String.fromCharCode(...value))
            } catch {
              throw new Error("Invalid binary data for Base64 encoding")
            }
          }
          await AsyncStorage.setItem(key, stringValue)
        },
        catch: (error) =>
          new PlatformError.SystemError({
            module: "KeyValueStore",
            method: "set",
            reason: error instanceof Error && error.message === "Invalid binary data for Base64 encoding" ? "InvalidBinary" : "Unknown",
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
        pathOrDescriptor: key,
        message: `Key '${key}' not found in secure storage`
      })
    }
    if (cause.message.includes("size limit") || cause.message.includes("2048")) {
      return new PlatformError.SystemError({
        module: "KeyValueStore",
        method,
        reason: "SizeLimit",
        pathOrDescriptor: key,
        message: `Value for key '${key}' exceeds 2KB SecureStore limit`
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
const chunkString = (str: string, maxSize: number): string[] => {
  const chunks: string[] = []
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
    const keys = new Set<string>(currentKeys ? JSON.parse(currentKeys) : [])
    
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
    return keysJson ? JSON.parse(keysJson) as string[] : []
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeSecureStore = (options: SecureStoreOptions = {}): KeyValueStore.KeyValueStore => {
  const registry = options.keyRegistry ?? makeAsyncStorage()
  const maxSize = options.maxValueSize ?? 1900 // Safe margin under 2KB limit
  const storeOptions = options.secureStoreOptions

  const get = (key: string) =>
    Effect.gen(function*() {
      try {
        const value = yield* Effect.tryPromise(() => SecureStore.getItemAsync(key, storeOptions))
        if (!value) return Option.none()
        
        // Handle chunked data
        if (value.startsWith("__chunked__")) {
          const metadata = JSON.parse(value.slice(11))
          const chunks = yield* Effect.all(
            Array.from({ length: metadata.totalChunks }, (_, i) =>
              Effect.tryPromise(() => SecureStore.getItemAsync(`${key}__chunk__${i}`, storeOptions))
            ),
            { concurrency: 5 }
          )
          return Option.some(chunks.join(""))
        }
        
        return Option.some(value)
      } catch (error) {
        yield* Effect.fail(createSecureStoreError("get", key, error))
      }
    })

  const remove = (key: string) =>
    Effect.gen(function*() {
      try {
        // Check if chunked
        const mainValue = yield* Effect.tryPromise(() => SecureStore.getItemAsync(key, storeOptions))
        
        if (mainValue?.startsWith("__chunked__")) {
          const metadata = JSON.parse(mainValue.slice(11))
          yield* Effect.all(
            Array.from({ length: metadata.totalChunks }, (_, i) =>
              Effect.tryPromise(() => SecureStore.deleteItemAsync(`${key}__chunk__${i}`, storeOptions))
            ),
            { concurrency: 5 }
          )
        }
        
        yield* Effect.tryPromise(() => SecureStore.deleteItemAsync(key, storeOptions))
        yield* updateKeyRegistry(registry, key, "remove")
      } catch (error) {
        yield* Effect.fail(createSecureStoreError("remove", key, error))
      }
    })

  return KeyValueStore.make({
    get,

    getUint8Array: (key: string) =>
      Effect.gen(function*() {
        const value = yield* get(key)
        if (Option.isNone(value)) return Option.none()
        
        try {
          const decoded = Uint8Array.from(atob(value.value), c => c.charCodeAt(0))
          return Option.some(decoded)
        } catch {
          yield* Effect.fail(new PlatformError.SystemError({
            module: "KeyValueStore",
            method: "getUint8Array", 
            reason: "InvalidBase64",
            pathOrDescriptor: key,
            message: "Stored value is not valid Base64"
          }))
        }
      }),

    set: (key: string, value: string | Uint8Array) =>
      Effect.gen(function*() {
        let stringValue: string
        if (typeof value === "string") {
          stringValue = value
        } else {
          try {
            stringValue = btoa(String.fromCharCode(...value))
          } catch {
            yield* Effect.fail(new PlatformError.SystemError({
              module: "KeyValueStore",
              method: "set",
              reason: "InvalidBinary",
              pathOrDescriptor: key,
              message: "Invalid binary data for Base64 encoding"
            }))
          }
        }

        try {
          if (stringValue.length <= maxSize) {
            // Single value storage
            yield* Effect.tryPromise(() => SecureStore.setItemAsync(key, stringValue, storeOptions))
          } else {
            // Chunked storage
            const chunks = chunkString(stringValue, maxSize)
            const metadata = { totalChunks: chunks.length, type: "chunked" }
            
            yield* Effect.tryPromise(() => 
              SecureStore.setItemAsync(key, `__chunked__${JSON.stringify(metadata)}`, storeOptions)
            )
            
            yield* Effect.all(
              chunks.map((chunk, i) =>
                Effect.tryPromise(() => 
                  SecureStore.setItemAsync(`${key}__chunk__${i}`, chunk, storeOptions)
                )
              ),
              { concurrency: 5 }
            )
          }
          
          // Update registry
          yield* updateKeyRegistry(registry, key, "set")
        } catch (error) {
          yield* Effect.fail(createSecureStoreError("set", key, error))
        }
      }),

    remove,

    clear: Effect.gen(function*() {
      const keys = yield* getRegisteredKeys(registry)
      yield* Effect.all(
        keys.map(key => remove(key)),
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