# @effect-native/libsqlite — Phase 1 Instructions

## Overview

Universal, prebuilt libsqlite3 dynamic library bundle (Pure-Nix) that Just Works™ across supported desktop/server platforms. The package ships fresh `libsqlite3` binaries built from `nixpkgs-unstable`, auto-detects the host environment at runtime, and returns the correct `.dylib`/`.so` path for reliable extension loading in environments where the system SQLite is missing features or cannot load extensions.

- Package name: `@effect-native/libsqlite`
- Primary value: Reliable, version-pinned SQLite runtime for loading extensions
- Versioning: NPM package version matches the SQLite version (e.g., `3.50.2`), with optional JS-only patch suffix `-N` (e.g., `3.50.2-1`) that does not change the bundled SQLite version
- Example install: `bun add @effect-native/libsqlite@3.50`

## User Story

As a developer who needs to load SQLite extensions reliably across machines and CI, I want a universal `libsqlite3` that is version-pinned and known-good, so that I can load extensions without relying on inconsistent or outdated system SQLite installations.

## Core Requirements

- Provide prebuilt `libsqlite3` binaries for major desktop/server targets:
  - Darwin: `aarch64` (Apple Silicon) and `x86_64`
  - Linux: `x86_64` and `aarch64` with glibc; musl considered but optional in v1
- Runtime environment detection and path resolution:
  - Detect OS, architecture, and (on Linux) `glibc` vs `musl` to select the right binary
  - Expose a single JS/TS API to return the absolute path to the bundled `libsqlite3`
- Version mapping:
  - NPM version equals the SQLite version; optional `-N` suffix for JS-only patches
  - Ensure binary artifacts correspond exactly to the declared SQLite version
- Documentation and DX:
  - Clear usage docs and examples (Node.js and Bun)
  - JSDoc coverage for public API with compilable examples
- Compliance and metadata:
  - Include appropriate licenses/NOTICE for SQLite and nixpkgs artifacts
  - Publishable as ESM; type-checked via repository standards

## Technical Specifications

- Build source: `nixpkgs-unstable` (via the repo’s existing `flake.nix`) produces `libsqlite3` for each target
- Binary layout in package (illustrative):
  - `binaries/darwin-aarch64/libsqlite3.dylib`
  - `binaries/darwin-x86_64/libsqlite3.dylib`
  - `binaries/linux-x86_64-gnu/libsqlite3.so`
  - `binaries/linux-aarch64-gnu/libsqlite3.so`
  - `binaries/linux-x86_64-musl/libsqlite3.so` (optional)
  - `binaries/linux-aarch64-musl/libsqlite3.so` (optional)
- Runtime selection logic:
  - Detect via `process.platform`, `process.arch`, and glibc/musl sniffing (e.g. `process.report.getReport()`, `/lib/libc.musl-` presence, or other portable checks)
  - Export `resolveLibSqlite3Path(): string` (sync) and `libPath` constant for convenience
- Compatibility targets:
  - Node.js ≥ 18, Bun ≥ latest stable
  - ESM-first package with generated `.d.ts`
- No dynamic fetching at runtime; binaries are bundled in the npm tarball

## Acceptance Criteria

- Installing `@effect-native/libsqlite@3.50.x` yields a package whose bundled libsqlite3 is exactly SQLite `3.50.x`
- Calling `resolveLibSqlite3Path()` returns an existing absolute path to the correct binary on:
  - macOS arm64 and x64
  - Linux x64 glibc and arm64 glibc
- Example projects (Node and Bun) can successfully `dlopen` a simple test extension using the provided path (documented, not necessarily executed in CI)
- Full repository validations pass: lint, typecheck, docgen, tests, build
- JSDoc examples compile via `pnpm docgen`

## Out of Scope (v1)

- Windows `.dll` support
- Mobile platforms (iOS/Android)
- Automatic selection of system SQLite or fallback; v1 always uses bundled binaries (env opt-out may be considered later)
- Shipping third-party SQLite extensions; only the core `libsqlite3` is bundled

## Success Metrics

- 0 docgen/typecheck/lint/build errors in CI
- ≥ 95% successful environment detection in supported targets (validated via tests and local/CI matrices)
- Clear mapping of npm version → SQLite version with no mismatches
- Positive DX (copy-paste example works across Node and Bun)

## Future Considerations

- Add Windows `.dll` coverage
- Add musl Linux variants if not included in v1
- Provide an Effect Layer that exposes the resolved path via Context/Layer
- Publish additional channels tracking upstream SQLite releases automatically
- Optional environment variables to prefer system SQLite or force a specific variant

## Testing Requirements

- Unit tests: environment detection matrix (platform, arch, libc detection) and path resolution
- Property tests: version parsing and npm-version ↔ SQLite-version mapping
- Integration tests (where feasible): attempt `dlopen` of the resolved path (skipped in unsupported CI runners)
- Docgen validation: examples compile and typecheck
- Repository-wide checks: `pnpm lint`, `pnpm check`, `pnpm build` and targeted `pnpm test`

