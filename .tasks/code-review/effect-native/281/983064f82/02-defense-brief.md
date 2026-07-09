# Defense Brief

## Issue: Removed ServiceMap remains in normative guidance

- **My Claim:** Following repository instructions would reintroduce an API beta.94 removed.
- **Defense Hypothesis:** The references may be historical and intentionally describe the old API.
- **Evidence Search:** `AGENTS.md` and `.patterns/*.md` are explicitly normative; `effect-smol/migration/services.md` names `Context.Service` as the v4 replacement.
- **Verdict:** `survives`.

## Issue: Schema inference fixes are hidden behind skipped tests

- **My Claim:** The PR changes behavior without executable proof and retains prohibited skips.
- **Defense Hypothesis:** The feature is experimental and the tests may require an unavailable harness.
- **Evidence Search:** The package preload supplies the real driver and native extensions. Enabling the tests executes them immediately and reveals an actual invalid-primary-key defect.
- **Verdict:** `survives`.

## Issue: Generated CRR primary key is nullable

- **My Claim:** The advertised schema recreation flow fails at runtime.
- **Defense Hypothesis:** SQLite may infer non-nullability from `PRIMARY KEY`.
- **Evidence Search:** The real CR-SQLite extension rejects `id BLOB PRIMARY KEY` with “primary key is nullable”; `id BLOB NOT NULL PRIMARY KEY` passes all focused and end-to-end tests.
- **Verdict:** `survives`.

## Issue: Preserved error causes lack proof

- **My Claim:** The cause-preservation regression can recur silently.
- **Defense Hypothesis:** The mapping is mechanically obvious and typechecking is sufficient.
- **Evidence Search:** The outward error type is unchanged either way, so typechecking cannot distinguish dropped from preserved causes. A real missing-extension query exposes a structured `SqlError` cause.
- **Verdict:** `survives`.

## Issue: Darwin wrapper forces Nix

- **My Claim:** A standalone Zig installation on Darwin now fails if Nix is absent.
- **Defense Hypothesis:** Native builds are documented as dev-shell workflows.
- **Evidence Search:** The package previously required only `zig`; root guidance calls Nix optional. The observed failure is specific to a Nix-profile Zig used outside its shell.
- **Verdict:** `survives`; constrain re-entry to an active Nix profile.

## Issue: Native binaries changed

- **My Claim:** Opaque binary churn is unrelated to the Effect dependency migration.
- **Defense Hypothesis:** Rebuilding tracked artifacts with the current toolchain may be desirable maintenance.
- **Evidence Search:** No Zig source or build definition changed. The flake follows unstable nixpkgs, so byte changes are toolchain churn rather than a reproducible source update.
- **Verdict:** `survives`; restore the v4 artifacts.

## Issue: CI duplicates the TSTyche matrix

- **My Claim:** Inline CI targeting can diverge from `tstyche.json`.
- **Defense Hypothesis:** Both currently resolve the same seven compiler versions.
- **Evidence Search:** Both commands pass today, but `.ok/effect-refresh.ok.md` explicitly assigns matrix ownership to `tstyche.json`.
- **Verdict:** `survives` as a low-risk consistency fix.
