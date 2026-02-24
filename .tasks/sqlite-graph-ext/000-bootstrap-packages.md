# 000 — Bootstrap package topology

## Scope
- Create workspace package scaffolds for:
  - `packages/sqlite-graph-ext`
  - `packages/sqlite-graph-ext-demo`
- Add package metadata and workspace-visible structure required by the v4 monorepo patterns.

## Non-goals
- Implementing graph algorithms.
- Implementing Zig internals.
- Writing docs and perf tests.

## Acceptance criteria
- Both package directories exist.
- Both packages have `package.json` and `README.md`.
- Root workspace remains valid.

## Proof steps

1. Add package directories and `package.json` stubs with correct names and exports.
2. Ensure each package has a README and a `src` directory.
3. Confirm package presence in workspace via `bun run check`.

## done_when

```bash
test -d packages/sqlite-graph-ext && test -d packages/sqlite-graph-ext-demo && test -f packages/sqlite-graph-ext/package.json && test -f packages/sqlite-graph-ext-demo/package.json && node -e "const p=require('./package.json');if(!Array.isArray(p.workspaces)||!p.workspaces.includes('packages/*'))process.exit(1)"
```
