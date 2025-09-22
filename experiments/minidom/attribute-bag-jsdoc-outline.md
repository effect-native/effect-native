# MiniDom AttributeBag JSDoc Example Outline

Goal: capture a short synchronous example using `AttributeBag.make` + `Sync.detect` to highlight synchronous mutation flows for documentation.

1. Use `Effect.gen` to allocate a service, set namespace + null namespace attributes, and call `snapshot()`.
2. Demonstrate `Sync.detect` returning a capability that allows `Effect.runSync` to execute the program.
3. Show resulting `view.entries()` printed or asserted as an array of tuples.
4. Keep runtime deterministic (no timers) so the example compiles under docgen.

Next actions:
- Translate outline into actual `@example` block on `AttributeBag.make` JSDoc comment.
- Add secondary `@example` for `Sync.detect` referencing the same snippet to avoid duplication.
