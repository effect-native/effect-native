# Effect Beta Refresh: Definition of Done

## Mission

Keep the `v4` line current with the upstream Effect v4 beta family through a recurring `v4-refresh` branch and PR.

## Gate 1: Branch Freshness

```bash
git merge-base --is-ancestor origin/v4 HEAD
```

Pass condition: `v4-refresh` is rebased on the current `origin/v4` before dependency or API work starts.

## Gate 2: Effect Beta Family Is Current

```bash
npm view effect dist-tags --json
npm view @effect/platform-node dist-tags --json
npm view @effect/sql-sqlite-bun dist-tags --json
npm view @effect/sql-sqlite-node dist-tags --json
rg -n '"effect": \["effect@4\.0\.0-beta\.' bun.lock
rg -n '"@effect/(platform-node|sql-sqlite-bun|sql-sqlite-node)": \["@effect/' bun.lock
```

Pass condition: `bun.lock` resolves the Effect beta family used by this repo to the current npm `beta` dist-tag.

## Gate 3: Reference Checkout Is Fresh

```bash
git -C /Users/tom/Work/refs/effect-smol status --short --branch
git -C /Users/tom/Work/refs/effect-smol rev-parse HEAD
git ls-remote https://github.com/Effect-TS/effect-smol.git HEAD
```

Pass condition: `/Users/tom/Work/refs/effect-smol` exists, is updated by fast-forward from upstream, and untracked local files are preserved.

## Gate 4: Reconciliation Artifacts Are Current

```bash
test -f .gaps/effect-refresh.md
test -f .tasks/work-orders.md
```

Pass condition: `.gaps/effect-refresh.md` records the current refresh evidence, and `.tasks/work-orders.md` lists no more than five active work orders.

## Gate 5: Quality Gates

```bash
bun install --frozen-lockfile
bun run lint-fix
bun run docgen
bun run ok
! rg --hidden -n 'effect/ServiceM[a]p|ServiceM[a]p\.Service' AGENTS.md .patterns .ok packages
```

Pass condition: all commands exit `0`; active guidance and code contain no removed `ServiceMap` API references; TypeScript edits are followed by `bun run lint-fix`; no test skip/fallback wrappers are introduced to hide failures.

Type-test intent: `tstyche.json` owns the classic TypeScript compiler matrix. It must cover supported classic compiler releases while `bun run check:tsgo` covers the native TypeScript line.

## Gate 6: PR Lifecycle

```bash
gh pr list --repo effect-native/effect-native --head v4-refresh --base v4 --state open --json number,url
```

Pass condition: `origin/v4-refresh` is pushed, and an open PR from `v4-refresh` into `v4` exists when there are changes to merge.
