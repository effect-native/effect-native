# @effect-native/multi-runtime-test-runner

Run tests across multiple JavaScript runtimes and versions (Node.js, Bun, Browser) with Effect-based orchestration.

## Features

- **Multi-Runtime Support**: Execute tests across Node.js versions, Bun, and browser environments
- **Effect Integration**: Built on @effect/vitest infrastructure for robust test orchestration
- **Parallel Execution**: Run tests concurrently across runtimes for faster feedback
- **Structured Results**: Detailed per-runtime reporting with test counts and timing
- **Configuration**: Flexible runtime configuration with custom commands, arguments, and environment variables

## Installation

```bash
pnpm add @effect-native/multi-runtime-test-runner
```

## Quick Start

```typescript
import { Effect } from "effect"
import { 
  MultiRuntimeTestRunnerLive, 
  runMultiRuntimeTestsParallel,
  defaultRuntimes 
} from "@effect-native/multi-runtime-test-runner"

const program = runMultiRuntimeTestsParallel("**/*.test.ts", [
  defaultRuntimes.node("18"),
  defaultRuntimes.node("20"), 
  defaultRuntimes.bun,
  defaultRuntimes.browser
])

Effect.runPromise(
  program.pipe(Effect.provide(MultiRuntimeTestRunnerLive))
).then(console.log)
```

## CLI Usage

```bash
# Run tests with default runtimes (Node.js 18, 20, and Bun)
pnpm test:multi-runtime

# Specify test pattern
pnpm test:multi-runtime "src/**/*.test.ts"

# Choose specific runtimes
pnpm test:multi-runtime --runtimes=node18,bun,browser

# Run in parallel (default)
pnpm test:multi-runtime --parallel
```

## Configuration

### Runtime Configuration

```typescript
interface RuntimeConfig {
  readonly name: string
  readonly version?: string
  readonly command: string
  readonly args: ReadonlyArray<string>
  readonly env?: Record<string, string>
  readonly timeout?: number
}
```

### Default Runtimes

- `defaultRuntimes.node(version?)` - Node.js runtime with optional version
- `defaultRuntimes.bun` - Bun runtime
- `defaultRuntimes.browser` - Browser runtime via Puppeteer

### Custom Runtime

```typescript
const customRuntime: RuntimeConfig = {
  name: "custom-node",
  version: "19", 
  command: "node",
  args: ["--experimental-modules", "--test"],
  env: { NODE_ENV: "test" },
  timeout: 30000
}
```

## API Reference

### Services

- `MultiRuntimeTestRunner` - Main service for executing multi-runtime tests
- `MultiRuntimeTestRunnerLive` - Live implementation layer

### Functions

- `runMultiRuntimeTests` - Sequential execution across runtimes
- `runMultiRuntimeTestsParallel` - Parallel execution across runtimes

### Types

- `RuntimeConfig` - Configuration for a specific runtime
- `RuntimeResult` - Results from executing tests in a runtime

## Integration with @effect/vitest

This package builds on @effect/vitest's proven patterns:

- Effect-based test orchestration and resource management
- Proper cleanup and error handling
- Integration with existing test infrastructure
- Layer-based dependency injection

## License

MIT