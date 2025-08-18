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
          const decoded = Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
          return Option.some(decoded)
        },
        catch: (error) =>
          new PlatformError.SystemError({
            module: "KeyValueStore",
            method: "getUint8Array",
            reason: "Unknown",
            pathOrDescriptor: key,
            cause: error instanceof Error ? error : undefined
          })
      }),

    set: (key: string, value: string | Uint8Array) =>
      Effect.tryPromise({
        try: async () => {
          const stringValue = typeof value === "string"
            ? value
            : btoa(String.fromCharCode(...value))
          await AsyncStorage.setItem(key, stringValue)
        },
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
 * @since 1.0.0
 * @category constructors
 */
export const makeSecureStore = (): KeyValueStore.KeyValueStore =>
  KeyValueStore.makeStringOnly({
    get: (key: string) =>
      Effect.tryPromise({
        try: async () => {
          const value = await SecureStore.getItemAsync(key)
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
        try: () => SecureStore.setItemAsync(key, value),
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
        try: () => SecureStore.deleteItemAsync(key),
        catch: (error) =>
          new PlatformError.SystemError({
            module: "KeyValueStore",
            method: "remove",
            reason: "Unknown",
            pathOrDescriptor: key,
            cause: error instanceof Error ? error : undefined
          })
      }),

    clear: Effect.gen(function*() {
      const allKeys = yield* Effect.tryPromise({
        try: async () => {
          const keys: string[] = []
          return keys
        },
        catch: (error) =>
          new PlatformError.SystemError({
            module: "KeyValueStore",
            method: "clear",
            reason: "Unknown",
            pathOrDescriptor: "SecureStore",
            cause: error instanceof Error ? error : undefined
          })
      })
      yield* Effect.all(
        allKeys.map((key) =>
          Effect.tryPromise({
            try: () => SecureStore.deleteItemAsync(key),
            catch: (error) =>
              new PlatformError.SystemError({
                module: "KeyValueStore",
                method: "clear",
                reason: "Unknown",
                pathOrDescriptor: key,
                cause: error instanceof Error ? error : undefined
              })
          })
        ),
        { concurrency: "unbounded" }
      )
    }),

    size: Effect.succeed(0)
  })

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
 * Creates a KeyValueStore layer that uses Expo's SecureStore.
 * Values are stored securely using the device's keychain/keystore.
 * Note: SecureStore has a 2KB size limit per value.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerSecureStore: Layer.Layer<KeyValueStore.KeyValueStore> = Layer.succeed(
  KeyValueStore.KeyValueStore,
  makeSecureStore()
)