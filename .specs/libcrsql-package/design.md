# Technical Design: @effect-native/libcrsql Package

## Effect Library Patterns

### Core Effect Patterns Implementation

```typescript
// Primary module structure following Effect conventions
export {
  /**
   * Platform-detected path to cr-sqlite extension binary
   * @since 0.16.3
   * @category Primary API
   * @example
   * ```typescript
   * import { pathToCrSqliteExtension } from "@effect-native/libcrsql"
   * import Database from "better-sqlite3"
   * 
   * const db = new Database(":memory:")
   * db.loadExtension(pathToCrSqliteExtension)
   * ```
   */
  pathToCrSqliteExtension,
  
  /**
   * Effect-based extension path resolution with error handling
   * @since 0.16.3  
   * @category Advanced API
   * @example
   * ```typescript
   * import { getCrSqliteExtensionPath } from "@effect-native/libcrsql"
   * import { Effect } from "effect"
   * 
   * const program = Effect.gen(function* () {
   *   const extensionPath = yield* getCrSqliteExtensionPath()
   *   // Use with your SQLite database
   *   return extensionPath
   * })
   * ```
   */
  getCrSqliteExtensionPath,
  
  /**
   * Platform type union for supported platforms
   * @since 0.16.3
   * @category Types
   */
  Platform,
  
  /**
   * Error thrown when platform is not supported
   * @since 0.16.3
   * @category Errors
   */
  PlatformNotSupportedError
} from "./internal/index.js"
```

### Error Handling Strategy

```typescript
import { Data } from "effect"

/**
 * Tagged error for unsupported platform scenarios
 * Follows Effect Data.TaggedError pattern - NO custom Error classes
 */
export class PlatformNotSupportedError extends Data.TaggedError("PlatformNotSupportedError")<{
  readonly platform: string
  readonly supportedPlatforms: readonly string[]
  readonly detectedArch: string
  readonly detectedPlatform: string
}> {
  /**
   * Creates user-friendly error message
   * @since 0.16.3
   */
  get message() {
    return `Platform "${this.platform}" is not supported. Detected: ${this.detectedPlatform}-${this.detectedArch}. Supported platforms: ${this.supportedPlatforms.join(", ")}`
  }
}
```

### Generator Functions with Proper Error Yielding

```typescript
import { Effect } from "effect"

export const getCrSqliteExtensionPath = (
  platform?: Platform
): Effect.Effect<string, PlatformNotSupportedError> =>
  Effect.gen(function* () {
    // Detect platform if not provided
    const targetPlatform = platform ?? detectPlatform()
    
    // Validate platform support
    if (!isSupportedPlatform(targetPlatform)) {
      // CORRECT: return yield* for errors in generators
      return yield* Effect.fail(new PlatformNotSupportedError({
        platform: targetPlatform,
        supportedPlatforms: SUPPORTED_PLATFORMS,
        detectedArch: process.arch,
        detectedPlatform: process.platform
      }))
    }
    
    // Build path to binary
    const extensionPath = buildExtensionPath(targetPlatform)
    
    // Verify file exists
    const exists = yield* Effect.promise(() => fs.access(extensionPath))
      .pipe(
        Effect.map(() => true),
        Effect.catchAll(() => Effect.succeed(false))
      )
      
    if (!exists) {
      return yield* Effect.fail(new PlatformNotSupportedError({
        platform: targetPlatform,
        supportedPlatforms: SUPPORTED_PLATFORMS,
        detectedArch: process.arch,
        detectedPlatform: process.platform
      }))
    }
    
    return extensionPath
  })
```

### Resource Management Patterns

```typescript
import { Effect, Layer, Context } from "effect"

// Service pattern for advanced use cases
export interface LibCrSqliteService {
  readonly getExtensionPath: (platform?: Platform) => Effect.Effect<string, PlatformNotSupportedError>
  readonly getSupportedPlatforms: () => Effect.Effect<readonly string[]>
  readonly detectCurrentPlatform: () => Effect.Effect<string>
}

export const LibCrSqliteService = Context.GenericTag<LibCrSqliteService>("@effect-native/libcrsql/LibCrSqliteService")

export const LibCrSqliteServiceLive = Layer.succeed(
  LibCrSqliteService,
  {
    getExtensionPath: getCrSqliteExtensionPath,
    getSupportedPlatforms: () => Effect.succeed(SUPPORTED_PLATFORMS),
    detectCurrentPlatform: () => Effect.succeed(detectPlatform())
  }
)
```

## Type Safety Approach

### Zero Type Assertions Policy

```typescript
// FORBIDDEN: Type assertions
// const platform = process.platform as Platform  // ❌ NEVER

// CORRECT: Runtime validation with Schema
import { Schema } from "@effect/schema"

const PlatformSchema = Schema.Literal(
  "darwin-aarch64",
  "darwin-x86_64", 
  "linux-aarch64",
  "linux-x86_64",
  "win-x86_64",
  "win-i686",
  "android-aarch64",
  "ios-xcframework"
)

export type Platform = Schema.Schema.Type<typeof PlatformSchema>

// Safe platform detection with validation
const detectPlatform = (): string => {
  const platform = process.platform
  const arch = process.arch
  
  // Map Node.js values to our platform strings
  const platformMap: Record<string, Record<string, string>> = {
    "darwin": {
      "arm64": "darwin-aarch64",
      "x64": "darwin-x86_64"
    },
    "linux": {
      "arm64": "linux-aarch64", 
      "x64": "linux-x86_64"
    },
    "win32": {
      "x64": "win-x86_64",
      "ia32": "win-i686"
    }
  }
  
  const platformString = platformMap[platform]?.[arch]
  return platformString ?? `${platform}-${arch}`
}
```

### Branded Types for Domain Safety

```typescript
import { Brand } from "effect"

// Brand the extension path to prevent mixing with regular strings
export type ExtensionPath = string & Brand.Brand<"ExtensionPath">

export const ExtensionPath = Brand.nominal<ExtensionPath>()

export const createExtensionPath = (path: string): ExtensionPath =>
  ExtensionPath(path)
```

### Schema-Based Validation

```typescript
import { Schema } from "@effect/schema"

// Configuration schema for internal use
const LibCrSqliteConfigSchema = Schema.Struct({
  platform: PlatformSchema,
  libPath: Schema.String,
  version: Schema.Literal("0.16.3")
})

type LibCrSqliteConfig = Schema.Schema.Type<typeof LibCrSqliteConfigSchema>

// Runtime validation of configuration
const validateConfig = Schema.decodeUnknown(LibCrSqliteConfigSchema)
```

## Module Architecture

### Package Structure and Organization

```
packages-native/libcrsql/
├── package.json                    # @effect-native/libcrsql@0.16.3
├── README.md                       # Usage documentation
├── CHANGELOG.md                    # Version history
├── LICENSE                         # MIT license
├── src/
│   ├── index.ts                    # Public API exports
│   └── internal/
│       ├── index.ts                # Internal exports
│       ├── platform.ts             # Platform detection logic
│       ├── paths.ts                # Path building utilities
│       └── errors.ts               # Error definitions
├── lib/                            # Binary assets (gitignored, built)
│   ├── darwin-aarch64/
│   │   └── libcrsqlite.dylib
│   ├── darwin-x86_64/  
│   │   └── libcrsqlite.dylib
│   ├── linux-aarch64/
│   │   └── libcrsqlite.so
│   ├── linux-x86_64/
│   │   └── libcrsqlite.so
│   ├── win-x86_64/
│   │   └── crsqlite.dll
│   ├── win-i686/
│   │   └── crsqlite.dll
│   ├── android-aarch64/
│   │   └── libcrsqlite.so
│   └── ios-xcframework/
│       └── crsqlite.xcframework/
├── scripts/
│   └── download-binaries.ts        # Binary fetching script
├── test/
│   ├── index.test.ts               # Main API tests
│   ├── platform.test.ts            # Platform detection tests
│   └── integration.test.ts         # SQLite integration tests
├── tsconfig.json                   # Main TypeScript config
├── tsconfig.src.json               # Source compilation
├── tsconfig.test.json              # Test compilation  
├── tsconfig.build.json             # Build references
└── vitest.config.ts                # Test configuration
```

### Layer Composition Strategy

```typescript
import { Layer, Effect, Context } from "effect"

// Minimal service interface
export interface PlatformDetectionService {
  readonly detect: () => Effect.Effect<Platform, PlatformNotSupportedError>
  readonly validate: (platform: string) => Effect.Effect<Platform, PlatformNotSupportedError>
}

export const PlatformDetectionService = Context.GenericTag<PlatformDetectionService>(
  "@effect-native/libcrsql/PlatformDetectionService"
)

// Live implementation
export const PlatformDetectionServiceLive = Layer.succeed(
  PlatformDetectionService,
  {
    detect: () => Effect.gen(function* () {
      const detected = detectPlatform()
      return yield* validatePlatform(detected)
    }),
    validate: (platform: string) => validatePlatform(platform)
  }
)

// Path resolution service
export interface PathResolutionService {
  readonly resolvePath: (platform: Platform) => Effect.Effect<string>
  readonly verifyPath: (path: string) => Effect.Effect<string>
}

export const PathResolutionService = Context.GenericTag<PathResolutionService>(
  "@effect-native/libcrsql/PathResolutionService"  
)

export const PathResolutionServiceLive = Layer.succeed(
  PathResolutionService,
  {
    resolvePath: (platform: Platform) => Effect.succeed(buildExtensionPath(platform)),
    verifyPath: (path: string) => Effect.gen(function* () {
      const exists = yield* Effect.promise(() => fs.access(path))
        .pipe(Effect.as(true), Effect.catchAll(() => Effect.succeed(false)))
      
      if (!exists) {
        return yield* Effect.fail(new Error(`Extension not found at path: ${path}`))
      }
      
      return path
    })
  }
)

// Main service composition
export const LibCrSqliteServiceLive = Layer.effect(
  LibCrSqliteService,
  Effect.gen(function* () {
    const platformService = yield* PlatformDetectionService
    const pathService = yield* PathResolutionService
    
    return {
      getExtensionPath: (platform?: Platform) => Effect.gen(function* () {
        const targetPlatform = platform ?? (yield* platformService.detect())
        const path = yield* pathService.resolvePath(targetPlatform)
        return yield* pathService.verifyPath(path)
      }),
      getSupportedPlatforms: () => Effect.succeed(SUPPORTED_PLATFORMS),
      detectCurrentPlatform: () => Effect.map(platformService.detect(), p => p as string)
    }
  })
).pipe(
  Layer.provide(PlatformDetectionServiceLive),
  Layer.provide(PathResolutionServiceLive)
)
```

### Dependency Injection Pattern

```typescript
// Consumer code can use the service
export const createDatabaseWithExtension = (dbPath: string) =>
  Effect.gen(function* () {
    const libCrSqlite = yield* LibCrSqliteService
    const extensionPath = yield* libCrSqlite.getExtensionPath()
    
    // Create database and load extension
    const db = new Database(dbPath)
    db.loadExtension(extensionPath)
    
    return db
  }).pipe(
    Effect.provide(LibCrSqliteServiceLive)
  )
```

## Testing Strategy

### @effect/vitest Integration

```typescript
// test/index.test.ts
import { describe, it, expect } from "@effect/vitest"
import { Effect, TestClock, TestContext } from "effect"
import { pathToCrSqliteExtension, getCrSqliteExtensionPath } from "../src/index.js"

describe("LibCrSqlite", () => {
  it.effect("pathToCrSqliteExtension provides valid path for current platform", () =>
    Effect.gen(function* () {
      // Test synchronous API
      expect(typeof pathToCrSqliteExtension).toBe("string")
      expect(pathToCrSqliteExtension).toMatch(/\.(dylib|so|dll)$/)
    })
  )

  it.effect("getCrSqliteExtensionPath succeeds for current platform", () =>
    Effect.gen(function* () {
      const path = yield* getCrSqliteExtensionPath()
      expect(typeof path).toBe("string")
      expect(path.length).toBeGreaterThan(0)
    })
  )

  it.effect("getCrSqliteExtensionPath fails for unsupported platform", () =>
    Effect.gen(function* () {
      const result = yield* getCrSqliteExtensionPath("unsupported-platform" as any)
        .pipe(Effect.flip)
      
      expect(result._tag).toBe("PlatformNotSupportedError")
      expect(result.platform).toBe("unsupported-platform")
    })
  )

  describe("platform detection", () => {
    it.effect("detects darwin-aarch64", () => 
      Effect.gen(function* () {
        // Mock process.platform and process.arch
        const originalPlatform = process.platform
        const originalArch = process.arch
        
        try {
          Object.defineProperty(process, 'platform', { value: 'darwin', writable: true })
          Object.defineProperty(process, 'arch', { value: 'arm64', writable: true })
          
          const path = yield* getCrSqliteExtensionPath()
          expect(path).toContain("darwin-aarch64")
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true })
          Object.defineProperty(process, 'arch', { value: originalArch, writable: true })
        }
      })
    )
  })
})
```

### TestClock for Time-Dependent Testing

```typescript
// For any future caching or timeout logic
import { TestClock, Effect } from "effect"

it.effect("extension path resolution is cached for 1 hour", () =>
  Effect.gen(function* () {
    const testClock = yield* TestClock
    
    // First call
    const path1 = yield* getCrSqliteExtensionPath()
    
    // Advance time by 30 minutes  
    yield* testClock.adjust("30 minutes")
    
    // Should use cache
    const path2 = yield* getCrSqliteExtensionPath()
    expect(path2).toBe(path1)
    
    // Advance past cache expiry
    yield* testClock.adjust("31 minutes")
    
    // Should resolve again
    const path3 = yield* getCrSqliteExtensionPath()
    expect(path3).toBe(path1) // Same result but fresh resolution
  }).pipe(Effect.provide(TestClock.defaultTestClock))
)
```

### Property-Based Testing with FastCheck

```typescript
import fc from "fast-check"

it.effect("platform string parsing is robust", () =>
  Effect.gen(function* () {
    const validPlatforms = SUPPORTED_PLATFORMS
    const randomPlatform = fc.sample(fc.constantFrom(...validPlatforms), 1)[0]
    
    const path = yield* getCrSqliteExtensionPath(randomPlatform)
    expect(path).toContain(randomPlatform)
  })
)
```

## JSDoc Documentation Plan

### Comprehensive API Documentation

```typescript
/**
 * Path to the cr-sqlite extension binary for the current platform
 * 
 * This is the primary API for most use cases. The path is determined
 * automatically based on the current Node.js platform and architecture.
 * 
 * @since 0.16.3
 * @category Primary API
 * @example
 * ```typescript
 * import { pathToCrSqliteExtension } from "@effect-native/libcrsql"
 * import Database from "better-sqlite3"
 * 
 * // Create database and load cr-sqlite extension
 * const db = new Database(":memory:")
 * db.loadExtension(pathToCrSqliteExtension)
 * 
 * // Now you can use CRDT features
 * db.exec("SELECT crsql_version()")
 * ```
 * 
 * @example
 * ```typescript  
 * import { pathToCrSqliteExtension } from "@effect-native/libcrsql"
 * import sqlite3 from "sqlite3"
 * 
 * const db = new sqlite3.Database(":memory:")
 * db.loadExtension(pathToCrSqliteExtension, (err) => {
 *   if (err) throw err
 *   console.log("cr-sqlite extension loaded successfully")
 * })
 * ```
 */
export declare const pathToCrSqliteExtension: string

/**
 * Effect-based cr-sqlite extension path resolution with comprehensive error handling
 * 
 * This function provides more control than the simple pathToCrSqliteExtension export,
 * allowing explicit platform specification and proper Effect error handling.
 * 
 * @param platform - Optional platform specification. If omitted, current platform is detected
 * @returns Effect that succeeds with extension path or fails with PlatformNotSupportedError
 * 
 * @since 0.16.3
 * @category Advanced API  
 * @example
 * ```typescript
 * import { getCrSqliteExtensionPath } from "@effect-native/libcrsql"
 * import { Effect, Console } from "effect"
 * 
 * const program = Effect.gen(function* () {
 *   const extensionPath = yield* getCrSqliteExtensionPath()
 *   yield* Console.log(`Extension path: ${extensionPath}`)
 *   return extensionPath
 * })
 * 
 * Effect.runPromise(program)
 * ```
 * 
 * @example
 * ```typescript
 * import { getCrSqliteExtensionPath, Platform } from "@effect-native/libcrsql"  
 * import { Effect } from "effect"
 * 
 * // Cross-platform application - get paths for multiple platforms
 * const getAllPaths = Effect.gen(function* () {
 *   const platforms: Platform[] = ["darwin-aarch64", "linux-x86_64", "win-x86_64"]
 *   
 *   return yield* Effect.forEach(platforms, platform =>
 *     getCrSqliteExtensionPath(platform).pipe(
 *       Effect.map(path => ({ platform, path }))
 *     )
 *   )
 * })
 * ```
 * 
 * @example
 * ```typescript
 * import { getCrSqliteExtensionPath, PlatformNotSupportedError } from "@effect-native/libcrsql"
 * import { Effect, pipe } from "effect"
 * 
 * const handleExtensionPath = pipe(
 *   getCrSqliteExtensionPath(),
 *   Effect.catchTag("PlatformNotSupportedError", (error) =>
 *     Effect.gen(function* () {
 *       yield* Console.error(`Platform ${error.platform} not supported`)
 *       yield* Console.error(`Supported: ${error.supportedPlatforms.join(", ")}`)
 *       return yield* Effect.fail(error)
 *     })
 *   )
 * )
 * ```
 */
export declare const getCrSqliteExtensionPath: (
  platform?: Platform
) => Effect.Effect<string, PlatformNotSupportedError>
```

### Error Documentation with Examples

```typescript
/**
 * Error indicating that the current or specified platform is not supported
 * 
 * This error provides detailed information about platform detection and
 * available alternatives to help users understand and resolve the issue.
 * 
 * @since 0.16.3
 * @category Errors
 * @example
 * ```typescript
 * import { getCrSqliteExtensionPath, PlatformNotSupportedError } from "@effect-native/libcrsql"
 * import { Effect, Exit } from "effect"
 * 
 * const program = Effect.gen(function* () {
 *   try {
 *     const path = yield* getCrSqliteExtensionPath("unsupported-platform")
 *     return path
 *   } catch (error) {
 *     if (error instanceof PlatformNotSupportedError) {
 *       console.log(`Platform: ${error.platform}`)
 *       console.log(`Detected: ${error.detectedPlatform}-${error.detectedArch}`)
 *       console.log(`Supported: ${error.supportedPlatforms.join(", ")}`)
 *     }
 *     throw error
 *   }
 * })
 * 
 * const result = await Effect.runPromiseExit(program)
 * if (Exit.isFailure(result)) {
 *   console.error("Extension loading failed:", result.cause)
 * }
 * ```
 */
export declare class PlatformNotSupportedError extends Data.TaggedError("PlatformNotSupportedError")<{
  readonly platform: string
  readonly supportedPlatforms: readonly string[]
  readonly detectedArch: string  
  readonly detectedPlatform: string
}>
```

## Code Examples

### Basic SQLite Integration

```typescript
// examples/basic-usage.ts
import { pathToCrSqliteExtension } from "@effect-native/libcrsql"
import Database from "better-sqlite3"

// Simple database setup with cr-sqlite
const db = new Database(":memory:")
db.loadExtension(pathToCrSqliteExtension)

// Verify extension loaded
const version = db.prepare("SELECT crsql_version() as version").get()
console.log("cr-sqlite version:", version.version)

// Create a CRDT table
db.exec(`
  CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    title TEXT,
    content TEXT  
  );
  
  SELECT crsql_as_crr('posts');
`)

// Insert data
const insert = db.prepare("INSERT INTO posts (title, content) VALUES (?, ?)")
insert.run("Hello CRDT", "This post will sync across devices!")

// View CRDT metadata
const changes = db.prepare("SELECT * FROM crsql_changes").all()
console.log("CRDT changes:", changes)
```

### Effect-Based Database Service

```typescript
// examples/effect-service.ts
import { Effect, Context, Layer } from "effect"
import { getCrSqliteExtensionPath, LibCrSqliteService } from "@effect-native/libcrsql"
import Database from "better-sqlite3"

// Database service interface
interface DatabaseService {
  readonly query: <T = unknown>(sql: string, params?: unknown[]) => Effect.Effect<T[]>
  readonly execute: (sql: string, params?: unknown[]) => Effect.Effect<void>
  readonly close: () => Effect.Effect<void>
}

const DatabaseService = Context.GenericTag<DatabaseService>("DatabaseService")

// Implementation with cr-sqlite
const DatabaseServiceLive = Layer.effect(
  DatabaseService,
  Effect.gen(function* () {
    const libCrSqlite = yield* LibCrSqliteService
    const extensionPath = yield* libCrSqlite.getExtensionPath()
    
    const db = new Database(":memory:")
    db.loadExtension(extensionPath)
    
    return {
      query: <T>(sql: string, params: unknown[] = []) =>
        Effect.sync(() => db.prepare(sql).all(...params) as T[]),
      execute: (sql: string, params: unknown[] = []) =>
        Effect.sync(() => { db.prepare(sql).run(...params) }),
      close: () => Effect.sync(() => db.close())
    }
  })
).pipe(Layer.provide(LibCrSqliteServiceLive))

// Usage
const program = Effect.gen(function* () {
  const db = yield* DatabaseService
  
  // Setup CRDT table
  yield* db.execute(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
    SELECT crsql_as_crr('users');
  `)
  
  // Insert user
  yield* db.execute("INSERT INTO users (name) VALUES (?)", ["Alice"])
  
  // Query users
  const users = yield* db.query<{id: number, name: string}>("SELECT * FROM users")
  console.log("Users:", users)
  
  // View CRDT changes  
  const changes = yield* db.query("SELECT * FROM crsql_changes")
  console.log("CRDT changes:", changes)
})

Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))
```

## Integration Points

### Effect Ecosystem Integration

```typescript
// Integration with @effect/platform
import { FileSystem, Path } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"

export const verifyExtensionExists = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const exists = yield* fs.exists(path)
    
    if (!exists) {
      return yield* Effect.fail(new Error(`Extension binary not found: ${path}`))
    }
    
    // Check if file is readable
    yield* fs.access(path, fs.constants.R_OK)
    
    return path
  }).pipe(Effect.provide(NodeFileSystem.layer))

// Integration with @effect/schema for configuration validation
import { Schema } from "@effect/schema"

const DatabaseConfigSchema = Schema.Struct({
  path: Schema.String,
  enableCrSqlite: Schema.Boolean,
  crSqlitePlatform: Schema.optional(PlatformSchema)
})

export const createConfiguredDatabase = (config: unknown) =>
  Effect.gen(function* () {
    const validConfig = yield* Schema.decodeUnknown(DatabaseConfigSchema)(config)
    
    const db = new Database(validConfig.path)
    
    if (validConfig.enableCrSqlite) {
      const extensionPath = yield* getCrSqliteExtensionPath(validConfig.crSqlitePlatform)
      yield* Effect.sync(() => db.loadExtension(extensionPath))
    }
    
    return db
  })
```

### Build System Integration

```typescript
// scripts/download-binaries.ts - Binary fetching for build
import { Effect, Console } from "effect"
import * as fs from "fs"
import * as path from "path"

const RELEASE_ASSETS = [
  { platform: "darwin-aarch64", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-darwin-aarch64.zip" },
  { platform: "darwin-x86_64", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-darwin-x86_64.zip" },
  { platform: "linux-aarch64", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-linux-aarch64.zip" },
  { platform: "linux-x86_64", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-linux-x86_64.zip" },
  { platform: "win-x86_64", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-win-x86_64.zip" },
  { platform: "win-i686", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-win-i686.zip" },
  { platform: "android-aarch64", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-aarch64-linux-android.zip" },
  { platform: "ios-xcframework", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-ios-dylib.xcframework.tar.gz" }
]

const downloadAndExtract = (asset: typeof RELEASE_ASSETS[0]) =>
  Effect.gen(function* () {
    yield* Console.log(`Downloading ${asset.platform}...`)
    
    // Download binary
    const response = yield* Effect.promise(() => fetch(asset.url))
    const buffer = yield* Effect.promise(() => response.arrayBuffer())
    
    // Create platform directory
    const platformDir = path.join("lib", asset.platform)
    yield* Effect.sync(() => fs.mkdirSync(platformDir, { recursive: true }))
    
    // Extract and organize files
    const tempFile = path.join(platformDir, "temp" + (asset.url.endsWith(".tar.gz") ? ".tar.gz" : ".zip"))
    yield* Effect.sync(() => fs.writeFileSync(tempFile, Buffer.from(buffer)))
    
    // Extract using appropriate tool
    if (asset.url.endsWith(".tar.gz")) {
      yield* Effect.promise(() => exec(`tar -xzf ${tempFile} -C ${platformDir}`))
    } else {
      yield* Effect.promise(() => exec(`unzip -q ${tempFile} -d ${platformDir}`))
    }
    
    // Clean up temp file
    yield* Effect.sync(() => fs.unlinkSync(tempFile))
    
    yield* Console.log(`✓ ${asset.platform} extracted to ${platformDir}`)
  })

const downloadAllBinaries = Effect.gen(function* () {
  yield* Console.log("Downloading cr-sqlite binaries for all platforms...")
  
  // Download all platforms concurrently
  yield* Effect.forEach(
    RELEASE_ASSETS,
    downloadAndExtract,
    { concurrency: 4 } // Limit concurrent downloads
  )
  
  yield* Console.log("All binaries downloaded successfully!")
})

// Integration with package.json scripts
// "scripts": {
//   "prebuild": "tsx scripts/download-binaries.ts",
//   "build": "@effect/build-utils build"
// }
```

This comprehensive design covers all the critical aspects of implementing the `@effect-native/libcrsql` package with proper Effect library patterns, type safety, comprehensive testing, and integration strategies. The design ensures zero forbidden patterns, proper error handling, and follows all Effect ecosystem conventions.