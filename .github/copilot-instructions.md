# GitHub Copilot Instructions for `effect-native/effect-native` (`v4`)

Follow this file first. Use additional discovery only when these instructions are incomplete.

## Repository Profile

- Branch model: `main` stays Effect v3, `v4` is the long-lived Effect v4 beta branch.
- Package manager: Bun.
- Test runner guidance: `@effect-native/bun-test`.
- Workspace focus: `packages-native/*`.

## Command Baseline

Run commands with host Bun by default:

```bash
bun install --frozen-lockfile
bun run lint-fix
bun run lint
bun run check
bun run test
bun run build
bun run circular
bun run codegen
bun run test-types --target current
bun run verify-subpaths
bun run ok
```

Nix is optional convenience for CI-like reproducibility:

```bash
nix develop --command bun install --frozen-lockfile
nix develop --command bun run ok
```

## Required Workflow

Before editing:

```bash
bun install --frozen-lockfile
bun run lint
bun run check
```

After editing:

1. `bun run lint-fix`
2. `bun run lint`
3. `bun run check`
4. `bun run test`
5. `bun run build`
6. `bun run ok`

For smaller changes, run package-targeted tests first, then finish with root validation.

## Testing Guidance

- Effectful tests: import from `@effect-native/bun-test` and use `it.effect` / `it.scoped`.
- Pure tests: keep using `@effect-native/bun-test` primitives (`test`, `it`, `expect`).
- Time-based tests: use `TestClock`, not wall-clock waits.
- Do not call `Effect.runSync` inside Effect-based tests.

## Docs and Policy

- Keep operational docs bun-first.
- Keep Nix optional in docs, except maintainer scripts that are explicitly Nix-based.
- Do not introduce `pnpm` in operational scripts, CI commands, or normative guidance on `v4`.
- Leave `.tasks/` and `.specs/` historical content untouched unless explicitly requested.

## Native Dependency Recovery

If `better-sqlite3` ABI mismatches occur, rebuild in a consistent shell:

```bash
nix develop --command bun install --frozen-lockfile
nix develop --command bun --filter '*' rebuild better-sqlite3
nix develop --command bun run test
```

## File/Structure Notes

- Public APIs live in package top-level modules.
- Internal details stay under package `internal/` modules.
- Keep package docs in each package README and source JSDoc.
- Prefer code-local documentation over external duplicated docs.
