---
title: "v4 beta: debug — full migration including import path changes"
status: complete
branch: v4-beta-debug
worktree: /Users/tom/Developer/effect-native/v4-debug
pr_url: "https://github.com/effect-native/effect-native/pull/238"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with build + tests passing:
  - peerDependencies updated (effect ^4.0.0-beta.0, @effect/platform removed)
  - @effect/cli removed from deps (now effect/unstable/cli)
  - @effect/platform removed from deps (now effect/unstable/http etc)
  - @effect/platform-node@beta retained
  - @effect/vitest@beta retained
  - All import paths in src/ migrated to effect/unstable/* equivalents
  - pnpm build passes in worktree
  - pnpm test passes in worktree
basis: |
  - Build passes: `pnpm build` succeeds in worktree
  - Draft PR created: https://github.com/effect-native/effect-native/pull/238
  VERIFIED+FIXED 2026-02-20: Effect v4 API renames applied to test/CdpConnection.test.ts:
  - Effect.either(e) → Effect.result(e)
  - ._tag === "Right" / .right → ._tag === "Success" / .success
  - ._tag === "Left" / .left → ._tag === "Failure" / .failure
  - Effect.zipRight(...) → Effect.andThen(...)
  - Effect.catchAll(() => Effect.void) → Effect.ignore
  - Effect.yieldNow() → Effect.yieldNow (constant, not function)
  - describe.sequential.skipIf(cond) → describe.runIf(!cond).sequential
  - Stream.runCollect → Array<A> (removed Chunk.head)
  - Added DebugTransportType to withDebugEnvironment requirements union
  PR #238 converted from draft to ready for review.
  VERIFIED 2026-02-20 (final): `nix develop --command pnpm --filter @effect-native/debug test` → 6 tests
  skipped (all under describe.runIf(process.env.E2E === "1") — requires E2E env to run, correct by design).
  `nix develop --command pnpm --filter @effect-native/debug exec tsc --noEmit` → exit 0 (no TS errors).
  Copilot inline comment on Schema.Schema<A> constraint addressed with PR review (declined: suggestion was
  v3 API, v4 uses one type param; intersection with DecodingServices:never is correct v4 pattern).
artifacts:
  - path: packages-native/debug/package.json
    description: debug package manifest
  - path: packages-native/debug/src
    description: debug source files with updated imports
---

# v4 beta: @effect-native/debug

## Tier: 3 — Complex (merged deps + import path migration)

## Dependency Changes

### Remove (merged into effect core)
- `@effect/cli` (dep) → `effect/unstable/cli`
- `@effect/platform` (peer + dev) → `effect/unstable/http`, `effect/unstable/socket`, `effect/unstable/process`

### Update to @beta
- `effect`: peer `^3.19.0` → `^4.0.0-beta.0`, dev `latest` → `beta`
- `@effect/platform-node`: dep `latest` → `beta`
- `@effect/vitest`: dev `latest` → `beta`

## Import Migration

Scan all `.ts` files under `packages-native/debug/src/` and `packages-native/debug/test/` for:

| Old import | New import |
|---|---|
| `from "@effect/cli"` | `from "effect/unstable/cli"` |
| `from "@effect/cli/..."` | map subpath to `effect/unstable/cli` |
| `from "@effect/platform"` | `from "effect/unstable/http"` (or socket/process depending on usage) |
| `from "@effect/platform/..."` | map subpath to appropriate effect/unstable/* |

## Verification

After migrating, run in worktree:
1. `pnpm install`
2. `pnpm build` — must pass
3. `pnpm test` — must pass
