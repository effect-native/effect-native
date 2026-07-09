# Defense Brief

## Issue: TSTyche Excludes TypeScript 7

- **My Claim:** Excluding `7.0` from TSTyche might weaken type-test coverage.
- **Defense Hypothesis:** TypeScript 7 is the native/compiler-go package shape, while TSTyche imports the classic `lib/typescript.js` compiler API.
- **Evidence Search:** `bun run test-types` passes through TypeScript `6.0.3`; the separate `bun run check:tsgo` gate passes and is part of `scripts/ok.mjs`.
- **Verdict:** `downgraded`. The split is explicit and recorded in `.ok/effect-refresh.ok.md`.

## Issue: Darwin Re-Exec Adds Nix Coupling

- **My Claim:** Calling `nix develop` from `rebuild-all.mjs` could surprise non-Nix users.
- **Defense Hypothesis:** The repo already documents Nix as the reproducible environment, and host Darwin Zig failed to link libSystem outside that shell.
- **Evidence Search:** Host `zig build -Doptimize=ReleaseSafe` failed with unresolved Darwin symbols; `nix develop --command zig build -Doptimize=ReleaseSafe` passed; host `bun --filter @effect-native/sqlite-graph build` now passes by re-entering Nix.
- **Verdict:** `downgraded`. This is an explicit hard-fail environment repair, not a skip.

## Issue: Regenerated Native Artifacts

- **My Claim:** Binary churn may hide accidental artifact changes.
- **Defense Hypothesis:** The artifacts are generated outputs of the package's own rebuild script and are required for package distribution.
- **Evidence Search:** `bun --filter @effect-native/sqlite-graph build` regenerated all six artifacts; full `bun run ok` passed afterward, including pack/subpath/doc gates.
- **Verdict:** `downgraded`. Binary changes are expected from refreshing the native build path and are reproducible by the package script.

## Issue: CR-SQLite Schema Decode Semantics

- **My Claim:** Replacing `makeUnsafe` could change runtime behavior.
- **Defense Hypothesis:** `makeEffect` validates the same schema while returning typed failures; this is safer and compatible with Effect v4.
- **Evidence Search:** `bun --filter @effect-native/crsql test`, `bun run check`, `bun run check:tsgo`, `bun run test-types`, and `bun run ok` passed.
- **Verdict:** `withdrawn`. The change improves safety and maintains behavior.
