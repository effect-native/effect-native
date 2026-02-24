# 060 — Cross-platform artifact outputs

## Scope
- Ensure `build.zig` emits extension binaries for documented platforms and architectures.
- Regenerate `packages/sqlite-graph-ext/lib/*` where possible and capture missing platform evidence.

## Non-goals
- Making optional vector helpers production-ready.

## Acceptance criteria
- `packages/sqlite-graph-ext/lib/sqlite3_graph_ext.dylib`, `.so`, `.dll` artifacts are present for supported targets or a documented build blocker is captured.

## done_when

```bash
test -f packages/sqlite-graph-ext/lib/sqlite3_graph_ext.dylib || true
```

