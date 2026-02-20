---
title: "Migrate all packages to effect@beta and @effect/*@beta"
status: in_progress
done_when: |
  All per-package PRs merged into v4:
  - see .tasks/impl/v4-beta-*.md for individual status
  - each PR targets origin/v4
  - each package builds and tests pass at beta versions
basis: |
  Plan created 2026-02-19. Executing in 5 phases:
  Phase 1: root infra PR
  Phase 2: batch 1 simple packages
  Phase 3: batch 2 medium packages
  Phase 4: batch 3 complex packages
  Phase 5: scratchpad
artifacts:
  - path: .tasks/impl/v4-beta-root.md
    description: Root package.json resolutions + tooling update
  - path: .tasks/impl/v4-beta-bun-test.md
    description: bun-test package
  - path: .tasks/impl/v4-beta-libsqlite.md
    description: libsqlite package
  - path: .tasks/impl/v4-beta-name-checker.md
    description: name-checker package
  - path: .tasks/impl/v4-beta-repo-gaps.md
    description: repo-gaps package
  - path: .tasks/impl/v4-beta-ssh-keep.md
    description: ssh-keep package
  - path: .tasks/impl/v4-beta-examples-tui-testing-library.md
    description: examples-tui-testing-library package
  - path: .tasks/impl/v4-beta-openrouter.md
    description: openrouter package
  - path: .tasks/impl/v4-beta-opentui-dom.md
    description: opentui-dom package
  - path: .tasks/impl/v4-beta-opentui-dom-testing-library.md
    description: opentui-dom-testing-library package
  - path: .tasks/impl/v4-beta-patterns.md
    description: patterns package
  - path: .tasks/impl/v4-beta-schemas.md
    description: schemas package
  - path: .tasks/impl/v4-beta-tui-testing-library.md
    description: tui-testing-library package
  - path: .tasks/impl/v4-beta-crsql.md
    description: crsql package (complex)
  - path: .tasks/impl/v4-beta-debug.md
    description: debug package (complex)
  - path: .tasks/impl/v4-beta-effect-native.md
    description: effect-native CLI package (complex)
  - path: .tasks/impl/v4-beta-note.md
    description: note package (complex)
  - path: .tasks/impl/v4-beta-libcrsql.md
    description: libcrsql package (complex)
  - path: .tasks/impl/v4-beta-scratchpad.md
    description: scratchpad (all @effect/* packages)
---

# GOAL: Migrate all packages to effect@beta

## Context

Effect v4 restructured packages significantly. Many `@effect/*` packages were
merged into the `effect` core package under `effect/unstable/*` subpaths.

### Package Merges (no longer on npm as `@beta`)

| Removed package       | New location in effect@beta          |
|-----------------------|--------------------------------------|
| `@effect/platform`    | `effect/unstable/http`, `effect/unstable/socket`, `effect/unstable/process` |
| `@effect/cli`         | `effect/unstable/cli`                |
| `@effect/sql`         | `effect/unstable/sql`                |
| `@effect/experimental`| `effect/unstable/persistence`, `effect/unstable/devtools`, `effect/unstable/eventlog` |
| `@effect/rpc`         | `effect/unstable/rpc`                |
| `@effect/cluster`     | `effect/unstable/cluster`            |
| `@effect/ai`          | `effect/unstable/ai`                 |
| `@effect/workflow`    | `effect/unstable/workflow`           |

### Still Separate (have `@beta` dist-tag on npm)

`@effect/platform-node`, `@effect/platform-bun`, `@effect/platform-browser`,
`@effect/vitest`, `@effect/opentelemetry`, all `@effect/sql-sqlite-*`,
all `@effect/sql-pg`, `@effect/sql-mysql2`, `@effect/sql-mssql`, etc.,
all `@effect/ai-*` provider packages (`ai-openai`, `ai-anthropic`, `ai-openrouter`).

### Tooling (stable, per upstream Effect-TS/effect main)

`@effect/build-utils`, `@effect/eslint-plugin`, `@effect/language-service`,
`@effect/docgen` — these have NO beta dist-tag and stay at current stable versions.

## Branch Strategy

- Base: `origin/v4` (already in beta pre-release mode with changeset `pre.json`)
- Root infra branch: `v4/beta/root` (stacked on v4)
- All package branches: stacked on `v4/beta/root`
- All PRs target `v4`

## Execution Phases

### Phase 1 — Root Infrastructure
Branch: `v4/beta/root`
Changes:
- `resolutions.effect`: `latest` → `beta`
- `@effect/vitest` devDep: `latest` → `beta`
- Keep tooling deps at stable versions

### Phase 2 — Batch 1: Simple packages (only `effect` dep)
`bun-test`, `libsqlite`, `name-checker`, `repo-gaps`, `ssh-keep`,
`examples-tui-testing-library`

### Phase 3 — Batch 2: Medium packages (`effect` + `@effect/vitest`)
`openrouter`, `opentui-dom`, `opentui-dom-testing-library`, `patterns`,
`schemas`, `tui-testing-library`

### Phase 4 — Batch 3: Complex packages (merged deps, import path migration)
`crsql`, `debug`, `effect-native`, `note`, `libcrsql`
Each runs full build + test to verify.

### Phase 5 — Batch 4: Scratchpad
All 30+ @effect/* dependencies updated.
