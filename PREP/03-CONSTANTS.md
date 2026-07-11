# Constants

- Failures remain loud and structured; no skips, no-op fallbacks, or guards hide them.
- No unsafe assertions or `try`/`catch` inside `Effect.gen`.
- The Effect packages must resolve to one current beta family.
- `bun install --frozen-lockfile`, lint-fix, docgen, and `ok` must pass.
- The branch is pushed and represented by a ready PR into `v4`, but never merged here.
