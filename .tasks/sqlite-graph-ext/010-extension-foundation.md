# 010 — Zig extension foundation

## Scope
- Establish the Zig extension build surface:
  - `build.zig`
  - extension init symbol `sqlite3_graph_ext_init`
  - artifact name contract (`sqlite3_graph_ext`)
- Add minimal scaffolding for macOS/Linux/Windows shared library outputs.

## Non-goals
- Implementing all graph operators.
- Implementing Effect layer orchestration.
- Demo statement profiling.

## Acceptance criteria
- Shared-library build graph can be invoked for at least one platform.
- A placeholder `graph_ext_version()` function returns semver.
- `sqlite3_graph_ext_init` is discoverable in the compiled source contract.

## Proof steps

1. Add `build.zig` with platform/architecture matrix.
2. Add `src/extension.zig` with init function and version function.
3. Add package scripts to run native build from Zig.

## done_when

```bash
test -f packages/sqlite-graph-ext/build.zig && test -f packages/sqlite-graph-ext/src/extension.zig && rg -n "sqlite3_graph_ext_init|graph_ext_version" packages/sqlite-graph-ext/src/extension.zig
```
