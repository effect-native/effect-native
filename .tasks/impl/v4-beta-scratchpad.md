---
title: "v4 beta: scratchpad — update all @effect/* deps"
status: pending
branch: v4/beta/scratchpad
worktree: /Users/tom/Developer/effect-native/v4-scratchpad
pr_url: ""
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4:
  - All 30+ @effect/* deps updated
  - Merged packages removed (replaced by effect/unstable/* imports)
  - Remaining @effect/*@beta deps point to beta dist-tag
  - pnpm install succeeds
basis: ""
artifacts:
  - path: scratchpad/package.json
    description: scratchpad package manifest
---

# v4 beta: scratchpad

## Tier: 4 — Scratchpad (private workspace, comprehensive @effect/* update)

## Packages to REMOVE (merged into effect core, no @beta on npm)

- `@effect/platform` → use `effect/unstable/http`, `effect/unstable/socket`, `effect/unstable/process`
- `@effect/cli` → use `effect/unstable/cli`
- `@effect/experimental` → use `effect/unstable/persistence`, `effect/unstable/devtools`, `effect/unstable/eventlog`
- `@effect/rpc` → use `effect/unstable/rpc`
- `@effect/cluster` → use `effect/unstable/cluster`
- `@effect/ai` → use `effect/unstable/ai`
- `@effect/workflow` → use `effect/unstable/workflow`
- `@effect/typeclass` → check if merged or dropped
- `@effect/printer` → check if merged or dropped
- `@effect/printer-ansi` → check if merged or dropped
- `@effect/opentelemetry` → has @beta, keep but update to `beta`
- `@effect/platform-node-shared` → check @beta availability

## Packages to UPDATE to @beta dist-tag

- `effect`: `latest` → `beta`
- `@effect/platform-node`: `latest` → `beta`
- `@effect/platform-bun`: `latest` → `beta`
- `@effect/platform-browser`: `latest` → `beta`
- `@effect/vitest`: `latest` → `beta`
- `@effect/opentelemetry`: `latest` → `beta`
- `@effect/ai-anthropic`: `latest` → `beta`
- `@effect/ai-openai`: `latest` → `beta`
- `@effect/ai-openrouter`: `latest` → `beta`
- `@effect/sql-clickhouse`: `latest` → `beta`
- `@effect/sql-d1`: `latest` → `beta`
- `@effect/sql-libsql`: `latest` → `beta`
- `@effect/sql-mssql`: `latest` → `beta`
- `@effect/sql-mysql2`: `latest` → `beta`
- `@effect/sql-pg`: `latest` → `beta`
- `@effect/sql-sqlite-bun`: `latest` → `beta`
- `@effect/sql-sqlite-do`: `latest` → `beta`
- `@effect/sql-sqlite-node`: `latest` → `beta`
- `@effect/sql-sqlite-react-native`: `latest` → `beta`
- `@effect/sql-sqlite-wasm`: `latest` → `beta`
- `@effect/sql-d1`: `latest` → `beta`

## Notes

Scratchpad is a private exploration workspace — no published artifact, no peer deps.
Build verification not required; `pnpm install` success is sufficient.
Any source files that use removed packages should have imports noted but don't
block the PR — scratchpad is exploratory.
