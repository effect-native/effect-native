# `@effect-native/patterns`

Hands-on study material for the Effect Native codebase. Each module in this
package illustrates the expectations described in the normative pattern library
(`.patterns/*.md`).

## Thing

`Thing` is a deliberately small data type that demonstrates several of the
library-wide rules:

- **Type identifiers**: every instance carries a stable `TypeId` symbol so it
  can be recognised safely across module boundaries.
- **Structural protocols**: the prototype implements `Equal.symbol` and
  `Hash.symbol`, using `Hash.cached` plus sorted, deduplicated tags to keep hash
  codes deterministic.
- **Dual combinators**: higher-order helpers like `mapValue` and `addTag` are
  exposed with `dual` so they support both data-first and data-last styles.
- **Pipeable**: the prototype delegates to Effect's `pipeArguments` helper so
  instances compose naturally with `.pipe(...)`.

The accompanying tests in `test/Thing.test.ts` follow the
`@effect/vitest` conventions from `.patterns/testing-patterns.md`, showing how
structured data (`Data.struct`) integrates with `Equal`/`Hash`.

## Usage

```ts
import * as Thing from "@effect-native/patterns/Thing"

const todo = Thing.make({
  id: "add-patterns-docs",
  label: "Write README",
  value: { done: false }
})

const updated = todo.pipe(
  Thing.mapValue((value) => ({ ...value, done: true })),
  Thing.addTag("docs")
)
```

Run `pnpm --filter @effect-native/patterns test` inside `nix develop` to execute
the worked examples.
