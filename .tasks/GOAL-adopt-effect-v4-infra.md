---
title: Adopt Effect v4 repo-wide infra and tooling
status: in_progress
done_when: |
  all subtasks below are marked complete and reproducible checks pass in a clean tree:
  - bun run lint
  - bun run check
  - bun run check:tsgo
  - bun run build:tsgo
  - bun run test
  - bun run test-types --target current
  - bun run docgen
  - bun run verify-subpaths
basis: |
  Created from comparison of effect-smol (upstream Effect v4) vs effect-native/v4.
  See /Users/tom/Developer/work/.research/effect-v4/ for research docs.
  See /Users/tom/Developer/refs/effect-smol/ for upstream source of truth.
---

# GOAL: Adopt Effect v4 repo-wide infra and tooling

Align effect-native's repo infrastructure, tooling, and conventions with the
upstream Effect v4 repo (effect-smol). This is about the repo scaffolding, not
about migrating individual package source code to v4 APIs (that work was tracked
separately in `.tasks/impl/v4-beta-*.md`).

## Reference

- Upstream: `/Users/tom/Developer/refs/effect-smol`
- Research: `/Users/tom/Developer/work/.research/effect-v4/`

---

## 1. Linting: ESLint + Prettier -> oxlint + dprint

**Current**: ESLint 9 flat config + `@effect/eslint-plugin` (wraps dprint) + Prettier (ignores all TS/JS)
**Upstream**: oxlint with custom `@effect/oxc` plugin + standalone dprint. No ESLint. No Prettier.

### Tasks

- [x] **1a. Add dprint as standalone formatter**
- Add `dprint.json` at root matching upstream settings:
  ASI (no semicolons), double quotes, no trailing commas, 120 line width, 2-space indent, forced arrow parens
- Add `dprint` devDependency
- Update `lint` / `lint-fix` scripts to use `dprint check` / `dprint fmt`

- [x] **1b. Add oxlint as linter**
  - Add `oxlint` devDependency
  - Add `.oxlintrc.json` extending upstream patterns
  - We don't have `@effect/oxc` (that's a workspace package in effect-smol), so use the
    standard oxlint rules and add the barrel-import rule if available, or skip it

- [x] **1c. Remove ESLint + Prettier**
  - Remove `eslint`, all `@typescript-eslint/*`, `eslint-plugin-*`, `@eslint/*`, `@effect/eslint-plugin` devDependencies
  - Remove `eslint.config.mjs`
  - Remove `prettier`, `.prettierrc.json`, `.prettierignore`
  - Update `lint`/`lint-fix` scripts: `oxlint && dprint check` / `oxlint --fix && dprint fmt`

  - [x] **1d. Run dprint fmt across codebase and commit**
  - One-time bulk format to establish the new baseline

---

## 2. TypeScript configuration alignment

**Current**: `tsconfig.base.json` has `experimentalDecorators: true`, `emitDecoratorMetadata: true`, missing `erasableSyntaxOnly`, missing `rewriteRelativeImportExtensions`, missing `verbatimModuleSyntax`, missing `noUnusedLocals`/`noUnusedParameters`, missing `moduleDetection: "force"`
**Upstream**: Modern strict config, no decorators, `erasableSyntaxOnly`, `rewriteRelativeImportExtensions`, `verbatimModuleSyntax`, `moduleDetection: "force"`

### Tasks

- [ ] **2a. Update `tsconfig.base.json`**
  - Add: `erasableSyntaxOnly: true`, `rewriteRelativeImportExtensions: true`,
    `verbatimModuleSyntax: true`, `moduleDetection: "force"`,
    `noUnusedLocals: true`, `noUnusedParameters: true`, `noImplicitOverride: true`,
    `noFallthroughCasesInSwitch: true`
  - Remove: `experimentalDecorators`, `emitDecoratorMetadata` (not used upstream)
  - Evaluate: `allowJs: false` (upstream says "if you touch this, a puppy dies")

- [ ] **2b. Fix root `tsconfig.json` references**
  - Currently only references 2 packages (bun-test, patterns); should reference all packages
    or use a `tsconfig.packages.json` pattern like upstream
  - Remove stale `tsconfig.build.json` that references non-existent `packages/` directories

- [ ] **2c. Evaluate `ts-patch` / `tspc` adoption**
  - Upstream uses `tspc -b` (ts-patch compiled tsc) for the `@effect/language-service` transform
  - We currently use plain `tsc -b`; the language-service plugin is in our tsconfig but only
    works in IDE, not at build/check time
  - Decide: adopt `ts-patch` + `tspc` or keep plain `tsc`

- [x] **2d. Evaluate `tsgo` (native TS compiler) support**
  - Upstream has `build:tsgo` and `check:tsgo` scripts using `@typescript/native-preview`
  - Added `check:tsgo`, `build:tsgo`, and PR typecheck job in CI

---

## 3. Build system alignment

**Current**: Per-package `tsc -b tsconfig.build.json` -> babel annotate -> babel CJS -> `build-utils pack-v3`
**Upstream**: Root-level `tspc -b tsconfig.packages.json` (all packages at once) -> per-package babel + pack

### Tasks

- [ ] **3a. Consider root-level project-references build**
  - Upstream builds all packages in one `tspc -b tsconfig.packages.json` call, then per-package
    babel/pack. This is faster due to incremental project references.
  - Evaluate if this pattern works for our packages-native layout

- [ ] **3b. Update `@effect/build-utils` version**
  - Ensure we're on the same version upstream uses (or compatible)

---

## 4. Testing alignment

**Current**: vitest 3.2.4, `@effect/vitest` beta, shared config with `fakeTimers: { toFake: undefined }`,
`sequence: { concurrent: true }`, `addEqualityTesters()` in setup
**Upstream**: vitest 4.0.18 (pinned), `@effect/vitest` workspace, same shared config pattern

### Tasks

- [ ] **4a. Upgrade vitest to 4.x**
  - Upstream pins vitest 4.0.18 and all `@vitest/*` packages at same version
  - Our vitest 3.2.4 is behind; upgrade to 4.x for parity

- [ ] **4b. Update vitest.shared.ts**
  - Add `vite-tsconfig-paths` plugin (upstream uses `aliases()` from it)
  - We currently don't use it; this would remove the need for manual path aliasing

- [ ] **4c. Align vitest.config.ts project patterns**
  - Currently `projects: ["packages-native/*/vitest.config.ts"]`
  - Fine as-is, just ensure all packages have a vitest config

- [ ] **4d. Update tstyche config**
  - Add `"tsconfig": "ignore"` to match upstream
  - Currently we have `"checkSuppressedErrors": true` which upstream doesn't use

---

## 5. Fix existing v4 test/build failures

These are the concrete failures from `pnpm ok` on the v4 branch right now.

### Tasks

- [ ] **5a. Fix crsql test files (10 failures)**
  - 8 files with `it.scoped` -> need `it.effect("name", () => Effect.scoped(...))`
  - 2 files with `it.scoped.skip` -> need `it.effect.skip("name", () => Effect.scoped(...))`
  - Files: `CrSql.apply-peer.e2e.test.ts`, `CrSql.applyChanges.blob.test.ts`,
    `CrSql.atomic.test.ts`, `CrSql.automigrate.test.ts`, `CrSql.core-api.test.ts`,
    `CrSql.fractindex.test.ts`, `CrSql.schema-from-changes.test.ts`,
    `CrSql.schema-from-changes.unit.test.ts`, `CrSql.sql-injection.test.ts`,
    `CrSql.whole-crr-sync.test.ts`

- [ ] **5b. Fix tui-testing-library `Effect.async` (11 bun test failures)**
  - `packages-native/tui-testing-library/src/Spawn.ts` uses `Effect.async` -> `Effect.callback`
  - Two functions: `waitForText` (line 285) and `waitForStable` (line 323)

- [ ] **5c. Fix bun-test `Duration.DurationInput` (8 TS errors)**
  - `Duration.DurationInput` removed in v4; find replacement
  - `Duration.fromDurationInputUnsafe` removed; find replacement
  - Files: `src/index.ts`, `src/internal/internal.ts`, `src/types.ts`

- [ ] **5d. Fix crsql `SqliteClient.ts` type errors**
  - Duplicate `SqlError` import (line 18)
  - Missing `Effect` import (uses `Effect.fn`, `Effect.Effect` without importing)
  - `dtslint/CrSql.tst.ts`: `Context` no longer exported from `"effect"` top-level

- [ ] **5e. Fix repo-gaps lint error**
  - `packages-native/repo-gaps/src/index.ts:249` — `no-restricted-syntax` on spread args
    in `Array.push`

---

## 6. Codegen: barrel file generation

**Current**: Per-package `codegen` scripts, most just `echo "skip codegen"`, crsql uses `build-utils prepare-v3`
**Upstream**: `pnpm codegen` runs `effect-utils codegen` (from `@effect/utils` workspace package) to
auto-generate barrel `index.ts` files from module exports

### Tasks

- [ ] **6a. Evaluate adopting `effect-utils codegen`**
  - Upstream auto-generates barrel files; we hand-maintain them
  - Upstream rule: "Do NOT edit barrel index.ts files directly. Run pnpm codegen."
  - Decide if this is worth adopting for our ~18 packages

---

## 7. CI/CD alignment

**Current**: Self-hosted runner, check.yml has Types/Lint/Test(4 shards)/Verify jobs,
release.yml on push to `effect-native/main` or `v4`, snapshot.yml uses `pkg-pr-new`
**Upstream**: Ubuntu runners, check.yml has Lint/Types/Build/Bundle/Test(2x2 Node+Deno)/
JSDoc Analysis/Docgen/Circular jobs, release.yml with changesets, snapshot.yml

### Tasks

- [x] **7a. Add Build job to CI**
  - Upstream runs `pnpm build` in CI on PRs (with `stripInternal: true` via sed)
  - We don't currently build in CI

- [x] **7b. Add circular dependency check to CI**
  - We have `pnpm circular` locally; upstream runs it as a separate CI job
  - Add to check.yml

- [ ] **7c. Evaluate test matrix expansion**
  - Upstream tests on Node + Deno with 2 shards each
  - We test on Node only with 4 shards; consider adding Deno if relevant

- [ ] **7d. Update base branch references**
  - `.changeset/config.json` baseBranch is `"v4"` — correct for now
  - `.changeset/config.json` changelog repo is `"effect-native/effect"` — should be `"effect-native/effect-native"`

---

## 8. Nix devshell alignment

**Current**: flake.nix provides bun, pnpm, deno, nodejs_24, python3, yq-go, lazygit, custom libsqlite3
**Upstream**: flake.nix provides bun, deno, corepack, nodejs_24, python3

### Tasks

- [ ] **8a. Evaluate corepack vs direct pnpm**
  - Upstream uses `corepack` (which provides pnpm via `packageManager` field)
  - We provide `pnpm` directly in Nix; corepack approach is more aligned with `package.json`
  - Low priority, either approach works

---

## 9. Agent tooling / rulesync

**Current**: Hand-maintained AGENTS.md, `.tasks/AGENTS.md`, copilot-instructions.md
**Upstream**: `rulesync` generates rules for claudecode, codexcli, opencode from `.rulesync/` source

### Tasks

- [ ] **9a. Evaluate rulesync adoption**
  - Upstream runs `pnpm ai:rulesync` as `postinstall`
  - Single source of truth in `.rulesync/` generates agent configs for all tools
  - We already have opencode config in `.opencode/`; would rulesync help or conflict?

---

## 10. Dependency hygiene

### Tasks

- [ ] **10a. Update `@effect/vitest` and `effect` to latest beta**
  - Currently `effect@4.0.0-beta.7` and `@effect/vitest@4.0.0-beta.7`
  - Upstream is at `4.0.0-beta.8` (and likely newer by the time we get here)

- [ ] **10b. Audit devDependencies**
  - Remove: `madge` (upstream uses custom `scripts/circular.mjs` with dependency-cruiser — but we already use dependency-cruiser, so just remove madge)
  - Remove: `@edge-runtime/vm` if unused
  - Remove: `@vitest/web-worker` if unused
  - Evaluate: `@types/node` version alignment (we have 22.x, upstream has 25.x)

- [ ] **10c. Pin vitest sub-packages to same version**
  - Upstream pins all `@vitest/*` packages to exact `4.0.18`
  - We should do the same to avoid version skew

---

## Priority order

1. **P0 (unblocks everything)**: 5a-5e (fix existing failures so `pnpm ok` passes)
2. **P1 (high impact)**: 1a-1d (linting/formatting), 2a-2b (tsconfig), 4a (vitest upgrade)
3. **P2 (medium)**: 3a-3b (build), 7a-7d (CI), 10a-10c (deps)
4. **P3 (nice to have)**: 6a (codegen), 8a (nix), 9a (rulesync), 2c-2d (tspc/tsgo)
