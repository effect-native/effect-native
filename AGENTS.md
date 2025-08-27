# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the **effect-native fork** of the Effect TypeScript framework. It maintains custom packages while allowing contributions back to upstream Effect-TS/effect.

### Fork-Specific Setup

- **Git remotes**: `origin` points to `effect-native/effect`, `upstream` points to `Effect-TS/effect`
- **Branch strategy**:
  - `main`: Clean mirror of upstream for contributions
  - `effect-native/main`: Fork's branch with custom packages
- **Custom packages**: Located in `packages-native/`, use `@effect-native/` namespace
- **Pre-push hook**: Prevents accidentally pushing custom packages to upstream

## Critical Development Rules

⚠️ **Mandatory workflow for any TypeScript development:**
1. Create/modify function
2. Run `pnpm lint --fix` immediately after editing
3. Check TypeScript compilation
4. Write comprehensive tests with `@effect/vitest`
5. Validate JSDoc documentation compiles with `pnpm docgen`

⚠️ **Never violate these patterns:**
- **Never use `try-catch` in `Effect.gen`** - use Effect error handling
- **Never use type assertions** (`as never`, `as any`) - maintain type safety
- **Always use `return yield*`** for errors and interrupts
- **100% JSDoc coverage required** with working examples

### Story Before Action

Before taking any action (running commands, editing files, pushing commits, or invoking tools), briefly print the story, then proceed immediately — do not pause to ask for permission beyond the existing approval system. This keeps your pair programmer in the loop without blocking work:

- Goal: what outcome you are aiming for.
- Obstacle: what’s blocking or risky.
- Options: 2–3 plausible approaches considered.
- Chosen path: the approach you will take now.
- Why: why this is the best path to the goal.

Guidance:
- Keep each item concise (one short sentence), total under ~6 lines.
- Place the story immediately before the action (e.g., before shell/tool calls or large edits).
- Favor clarity over verbosity; update the story when the plan changes.
- Do not ask for extra confirmation; print the story and execute (the approval system handles sensitive operations).

### Identity and Push Safety

- Public identity: Never take public action in the name of anyone other than yourself. Do not misrepresent who is speaking. When commenting on PRs or public threads, clearly indicate your identity (e.g., note that you are the automation agent when applicable).
- Push discipline: Never run `git push` without explicit direction from the user/maintainer.

### Pre‑Push Review Gate

Before any `git push` (when explicitly directed to push):
- Fetch PR comments and CI status for the branch.
- Ensure all failed checks are resolved or re‑run and passing.
- Ensure all reviewer feedback is addressed in code or accompanied by clear, inline code comments explaining the resolution or rationale.
- If any item remains unresolved, refuse to push and report what needs attention instead.

### Local CI Parity

- Always run `pnpm ok` after making changes and before pushing. This mirrors our GitHub checks (types, lint, circular, codegen + diff, test-types target, docgen, codemod, build) so failures show up locally first.

## Development Commands

### Building
```bash
pnpm build              # Build all packages
pnpm codegen           # Re-generate package entrypoints
pnpm clean             # Clean build artifacts
```

### Testing
```bash
pnpm test              # Run all tests
pnpm test <pattern>    # Run tests matching pattern
pnpm coverage          # Run tests with coverage

# Run single test file
pnpm vitest test/Effect.test.ts

# Run tests for specific package
cd packages/effect && pnpm test
```

### Code Quality
```bash
pnpm check             # TypeScript type checking
pnpm lint              # ESLint
pnpm lint-fix          # Auto-fix lint issues
pnpm circular          # Check for circular dependencies
pnpm test-types        # Run type-level tests (tstyche)
```

### Documentation
```bash
pnpm docgen            # Generate API documentation
pnpm changeset         # Create changeset for changes
```

## Architecture

### Package Structure

The monorepo uses pnpm workspaces with packages organized in:
- `packages/`: Upstream Effect packages (effect, platform, cli, etc.)
- `packages/ai/`: AI-related packages (openai, anthropic, etc.)
- `packages-native/`: Fork-specific custom packages

### Core Design Patterns

1. **Effect System**: All async operations use the Effect type for composable error handling and dependency injection
2. **Layers**: Dependencies are provided through Layer composition
3. **Services**: Use Context.Tag for type-safe dependency injection
4. **Schemas**: Data validation and serialization via Schema module
5. **Pipeable API**: All modules follow pipe-first functional programming style

### Essential Effect Patterns

**Concurrency & Control Flow:**
- Use `Effect.all` for concurrent operations (not sequential await)
- Use `Effect.forEach` over manual loops for collections
- Use `Effect.raceAll` for timeout scenarios
- Use `Fiber` for advanced concurrency control
- Use `Queue` for producer/consumer patterns

**Error Handling:**
- Use `Effect.catchTag` for specific error handling
- Define custom error types extending `Data.TaggedError`
- Use `return yield*` for errors and interrupts (never throw)
- Implement proper error context with custom error types

**Resource Management:**
- Use `Effect.acquireUseRelease` for proper cleanup
- Use `Ref` for mutable state management in Effect context
- Use `Effect.cached` for expensive computations
- Implement proper batching with `Effect.forEach` options

**Type Safety:**
- Use branded types for domain-specific values
- Always validate inputs with `Schema`
- Use proper variance annotations (`in`/`out`)
- Leverage `Schema` for runtime validation and type inference

### Common Pitfalls to Avoid

- **Never mix Promise-based and Effect-based code directly**
- **Never use `Effect.runSync` in production code**
- **Never create Effects inside loops without proper batching**
- **Never ignore fiber interruption in long-running operations**
- **Never create circular dependencies between services**

### Key Modules

- **Effect**: Core effect system for async operations, error handling, and concurrency
- **Stream**: Streaming data processing with backpressure
- **Layer**: Dependency injection and resource management
- **Schema**: Runtime type validation and serialization
- **Platform**: Cross-platform I/O operations (HTTP, FileSystem, etc.)

### Testing Approach

- Tests use `@effect/vitest` with custom configuration in `vitest.shared.ts`
- Test files located in `test/` directories
- Use `it.effect` pattern for Effect-based tests
- Use `Effect.gen` for readable async test code
- Use `assert` methods instead of `expect` for Effect tests
- Utilize `TestClock` for time-dependent testing
- Prefer property-based testing with FastCheck where applicable

#### Idiomatic Effect-TS Testing Patterns

Following patterns from Effect-TS core packages like `@effect/cli` and `@effect/sql`:

1. **Test Services Over Mocks**: Create proper test services with inspection methods
   ```typescript
   // GOOD: Test service with inspection capabilities
   export class TestSqlClient extends Context.Tag("TestSqlClient")<
     TestSqlClient,
     SqlClient.SqlClient & {
       readonly queries: Ref.Ref<ReadonlyArray<ExecutedQuery>>
       readonly setResponse: <T>(response: T) => Effect.Effect<void>
     }
   >() {}
   
   // BAD: Complex mock with unnecessary methods
   const makeFakeSqlClient = (responses) => { /* 5 methods when 1 needed */ }
   ```

2. **Test Behavior, Not Implementation**: Focus on what the code does, not how
   ```typescript
   // GOOD: Test behavior
   it.scoped("returns the site identifier", () => ...)
   
   // BAD: Test implementation details
   it.scoped("executes site ID query and returns hex string", () => ...)
   ```

3. **One Behavior Per Test**: Each test should verify a single behavior
   ```typescript
   // GOOD: Separate tests for separate behaviors
   it("returns a hex string", () => ...)
   it("returns 32 characters", () => ...)
   
   // BAD: Multiple assertions testing different things
   it("everything about getSiteIdHex", () => {
     assert.strictEqual(result, "ABC...")  // value
     assert.strictEqual(queries.length, 1) // count
     assert.strictEqual(queries[0].sql, "SELECT...") // implementation
     assert.deepStrictEqual(params, []) // more implementation
   })
   ```

4. **Minimal Test Doubles**: Only implement what's needed for the test
   ```typescript
   // GOOD: Minimal connection that returns expected data
   const connection = {
     execute: () => Effect.succeed([{ site_id: "ABC123" }])
   }
   
   // BAD: Implementing executeRaw, executeStream, executeValues when unused
   ```

5. **Layer Composition for Dependencies**: Use Effect layers properly
   ```typescript
   // GOOD: Clean layer composition
   const TestStack = Layer.mergeAll(
     TestSqlClient.layer,
     CrSql.layer
   )
   
   // Test uses the composed stack
   it.scoped("test", () => 
     Effect.gen(function* () {
       const service = yield* CrSql.CrSql
       // ...
     }).pipe(Effect.provide(TestStack))
   )
   ```

6. **Avoid Testing SQL Strings**: SQL is implementation, not behavior
   ```typescript
   // GOOD: Test the result shape and validity
   assert.match(siteId, /^[A-F0-9]{32}$/)
   
   // BAD: Test exact SQL string
   assert.strictEqual(query, "SELECT hex(crsql_site_id()) AS site_id")
   ```

#### Example: Proper Effect-TS Test Structure

```typescript
// Test service definition (like MockConsole in @effect/cli)
export class TestSqlClient extends Effect.Service<TestSqlClient>()("TestSqlClient", {
  effect: Effect.gen(function* () {
    const responses = yield* Ref.make<Map<string, unknown>>(new Map())
    const queries = yield* Ref.make<Array<ExecutedQuery>>([])
    
    const connection = {
      execute: (sql: string, params: ReadonlyArray<Primitive>) =>
        Effect.gen(function* () {
          yield* Ref.update(queries, Array.append({ sql, params }))
          const responseMap = yield* Ref.get(responses)
          return responseMap.get(sql) ?? []
        })
    }
    
    const client = yield* SqlClient.make({
      acquirer: Effect.succeed(connection),
      compiler: Statement.makeCompilerSqlite()
    })
    
    return {
      ...client,
      setResponse: (sql: string, response: unknown) =>
        Ref.update(responses, map => map.set(sql, response)),
      getQueries: Ref.get(queries)
    }
  })
}) {}

// Focused behavior tests
describe("CrSql", () => {
  describe("getSiteIdHex", () => {
    it.scoped("returns a hex string", () =>
      Effect.gen(function* () {
        yield* TestSqlClient.setResponse(
          "SELECT hex(crsql_site_id()) AS site_id",
          [{ site_id: "A1B2C3D4E5F6789012345678ABCDEF90" }]
        )
        const crSql = yield* CrSql.CrSql
        const siteId = yield* crSql.getSiteIdHex
        assert.match(siteId, /^[A-F0-9]+$/)
      }).pipe(Effect.provide(TestStack))
    )
    
    it.scoped("returns 32 characters", () =>
      Effect.gen(function* () {
        yield* TestSqlClient.setResponse(
          "SELECT hex(crsql_site_id()) AS site_id", 
          [{ site_id: "A1B2C3D4E5F6789012345678ABCDEF90" }]
        )
        const crSql = yield* CrSql.CrSql
        const siteId = yield* crSql.getSiteIdHex
        assert.strictEqual(siteId.length, 32)
      }).pipe(Effect.provide(TestStack))
    )
  })
})
```

### Build System

- TypeScript project references for incremental compilation
- `@effect/build-utils` handles package bundling
- Each package has standard tsconfig files:
  - `tsconfig.json`: Main config
  - `tsconfig.src.json`: Source compilation
  - `tsconfig.test.json`: Test compilation
  - `tsconfig.build.json`: Build references

### packages-native isolation rule

- Do NOT reference workspace upstream packages from `packages-native/*` TypeScript configs.
  For example, do not add project references to `../../packages/effect/tsconfig.build.json` or
  `../../packages/platform/tsconfig.build.json`.
- `packages-native/*` must depend on released versions of upstream packages via peer/dev dependencies as appropriate,
  not on workspace source. This keeps native forks isolated from upstream internals and prevents
  workspace-wide compile spillover in CI builds.

## Fork Workflows

### Contributing to Upstream
```bash
git checkout main
git pull upstream main
git checkout -b feature/my-contribution
# Work in packages/ only
git push origin feature/my-contribution
# Create PR to Effect-TS/effect
```

### Working on Custom Packages
```bash
git checkout effect-native/main
# Work in packages-native/
git push origin effect-native/main
```

### Syncing with Upstream
```bash
git checkout main
git pull upstream main
git checkout effect-native/main
git merge main
```

## Package Conventions

### Creating New Packages

Custom packages in `packages-native/` should:
1. Use `@effect-native/` namespace in package.json
2. Follow same structure as packages in `packages/`
3. Include standard configs (tsconfig, vitest, docgen)
4. Use `@effect/build-utils` for building
5. Depend on `effect` as peer dependency

### JSDoc Requirements

All public APIs must include:
- `@since` tag with version
- `@example` tag with **compilable** usage example
- Brief description of functionality
- `@category` tag for documentation organization (optional)
- Proper import patterns in examples
- Real-world, practical usage demonstrations
- **100% JSDoc coverage** - no exceptions
- All examples must compile with `pnpm docgen`

### Changeset Process

Before committing features:
1. Run `pnpm changeset`
2. Select appropriate semver level (patch/minor/major)
3. Write clear changeset description
4. Reference issues with "closes #123" in commit messages

## Advanced Development Patterns

### Performance & Resource Management
- Use `Effect.cached` for expensive computations
- Use `Semaphore` for controlling concurrent access
- Implement structured concurrency with `Effect.fork`
- Use `Effect.acquireUseRelease` for proper resource cleanup
- Use streaming (`Stream`) for memory-efficient large data processing

### Type-Level Programming
- Use branded types for domain-specific type safety
- Implement phantom types for compile-time constraints
- Leverage conditional types for complex type constraints
- Use proper variance annotations (`in`/`out`)

### Error Architecture
- Create hierarchical error types with `Data.TaggedError`
- Use `Effect.mapError` for translating between error layers
- Implement centralized error translation strategies
- Never mix Promise-based and Effect-based error handling

### Debugging & Development
- Use `Effect.tap` for side-effect debugging without changing flow
- Use `Logger` service for structured logging in development
- Use `TestClock` and `TestContext` for deterministic testing
- Use `Effect.gen` with proper yielding for readable async code

### Service Design
- Create platform-agnostic service interfaces
- Use `Context.Tag` with proper type constraints
- Design services to be composable through Layer composition
- Avoid circular dependencies between services

## Agent Execution Protocol

This repository relies on precise, verifiable changes. Agents must follow an evidence‑first workflow to avoid memory‑based mistakes.

### Evidence‑First Verification

- Always read the source you’re talking about and cite it.
  - When claiming behavior or implementation, reference the exact file path and a small line range you just inspected.
  - Prefer `rg -n` or `sed -n 'X,Yn'` to show relevant snippets in messages when helpful.
- Verify before asserting status. For any package you touch, run:
  - `pnpm -C <pkg> check` – TypeScript project references compile
  - `pnpm -C <pkg> test -- --reporter basic` – Tests run; report pass/fail
  - `pnpm -C <pkg> build` – Build succeeds; artifacts exist in `build/*` and `dist/`
  - If appropriate, inspect `dist/package.json` exports, main/module/types
- Use a claim template in messages for important assertions:
  - What I checked: concise subject
  - How I checked: command(s) or file path + lines
  - What I observed: short factual output or snippet
  - Conclusion: the narrowly supported takeaway

### Procedural Guardrails

- Never rely on recollection of prior state. Reopen files or rerun commands immediately before claiming.
- Use concise preambles before tool calls to group intent (e.g., “Running tsc + tests for crsql”).
- For multi‑step work, keep an up‑to‑date plan with exactly one in‑progress step.
- Prefer minimal, scoped changes aligned with existing patterns; do not refactor unrelated code.
- When sandbox/network limitations block a command, state that it wasn’t executed and avoid conclusions dependent on it.

### TDD in This Repo (Red → Green → Refactor)

#### Critical: What a RED Test Actually Is

A RED test describes **what you WANT the code to do**, not what it currently does wrong:

```typescript
// ✅ CORRECT RED TEST: Describes desired behavior
it.scoped("returns the database version", () =>
  Effect.gen(function*() {
    const version = yield* CrSql.CrSql.getDbVersion
    assert.strictEqual(version, "42")  // This WILL fail - that's the point!
  }))

// ❌ WRONG: Testing that it's broken
it.scoped("getDbVersion dies with not implemented", () =>
  Effect.gen(function*() {
    const exit = yield* Effect.exit(CrSql.CrSql.getDbVersion)
    assert.ok(exit._tag === "Failure")  // This is NOT TDD!
  }))
```

The RED test **fails** because the feature doesn't exist yet, but it **describes the goal**.

#### The TDD Cycle

- **Red**: Write a test for the behavior you WANT. Watch it fail with "not implemented" or wrong result.
- **Green**: Implement just enough code to make the test pass.
- **Refactor**: Clean up the code while keeping tests green.

The test should NEVER assert that something is broken - it should assert what correct looks like!

### Quick Verification Checklist

- TypeScript: `pnpm -C <pkg> check` passes
- Tests: `pnpm -C <pkg> test -- --reporter basic` pass (or red by design in TDD)
- Build: `pnpm -C <pkg> build` succeeds; `dist/` contains `main/module/types` and valid `exports`
- Exports: `node -p "require('./dist/package.json').exports"` shape matches repo conventions
- Service deps: search for required `yield*` (e.g., `SqlClient.SqlClient`) in live layers
