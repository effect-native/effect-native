# libcrsql-next: Instructions

> **Phase 1 Document** — Intent and high-level goals only. No implementation details.

## Context

The `@effect-native/libcrsql` package currently ships pre-built CR-SQLite extension binaries for desktop and server platforms. These binaries are built from the original C/Rust upstream codebase.

The project has completed a major rewrite of CR-SQLite in Zig. This rewrite:
- Produces native extension binaries for all the same platforms
- Produces a WASM artifact for browser use (shipped separately as `@effect-native/libcrsql-browser`)
- Has passed comprehensive testing (154/154 tests) and is ready for distribution

The current package structure:
- `@effect-native/libcrsql` — Native binaries for Node.js/Bun (C/Rust-built)
- `@effect-native/libcrsql-browser` — WASM for browsers (Zig-built, new package)

This creates an inconsistency: server users get C/Rust binaries, browser users get Zig binaries. The wire format is compatible, but having two different codebases in production introduces maintenance burden and potential for divergence.

## User Stories

**As a server-side developer**, I want to use the Zig-built CR-SQLite extension instead of the C/Rust one, so that I am running the same codebase as browser users and benefit from the Zig rewrite improvements.

**As a library maintainer**, I want the native and browser packages to share the same underlying implementation, so that I only need to maintain one codebase and can guarantee identical replication semantics across environments.

**As an application developer building for both web and server**, I want confidence that my local development environment (Node.js) uses the same CR-SQLite implementation as my production web deployment, so that I do not encounter environment-specific replication bugs.

## High-Level Goals

1. **Transition native binaries to Zig-built artifacts** — The package should distribute Zig-built extensions instead of (or alongside) the current C/Rust-built extensions.

2. **Maintain backward compatibility** — Existing users who import the package should continue to have their code work without changes. The public API surface must not break.

3. **Support a transition period if needed** — If both artifact sets need to coexist temporarily (for validation, rollback capability, or gradual rollout), the package should support selecting between them.

4. **Align versioning strategy** — The package version should reflect which underlying CR-SQLite implementation it contains (the Zig rewrite is a new codebase, not an upstream version bump).

5. **Document platform parity** — Clearly communicate which platforms are supported and whether any platform-specific behaviors differ between Zig and C/Rust builds.

## Out of Scope

The following are explicitly NOT part of this effort:

- **Sync protocol or mesh networking** — This is about artifact distribution, not replication semantics or network transports.

- **Browser package changes** — The `@effect-native/libcrsql-browser` package is a separate concern and already ships Zig-built WASM.

- **Mobile platforms (iOS/Android)** — These remain out of scope as they were for the existing package. A separate mobile embedding guide is tracked elsewhere.

- **New public API additions** — This is about changing which binaries ship, not adding new functionality to the package's TypeScript surface.

- **Effect entrypoint changes** — The Effect-based API should continue to work as-is; only the underlying binary changes.

## Dependencies

This effort has two distinct categories of work:

### Depends on Zig Artifacts

The core goal (shipping Zig binaries) requires:
- Zig build pipeline producing binaries for all supported platforms (darwin-aarch64, darwin-x86_64, linux-aarch64, linux-x86_64, win-x86_64, win-i686)
- Zig artifacts being placed in a location the package can consume
- Checksums and verification scripts updated for new artifacts

### Pure JS/Packaging Work

Some aspects can proceed independently of Zig artifacts:
- Selection logic for choosing between artifact sets (if coexistence is needed)
- Version strategy documentation
- Test infrastructure for validating artifact selection
- README and changelog updates

## Open Questions

1. **Replacement or coexistence?** Should Zig artifacts fully replace C/Rust artifacts, or should both be available with a selection mechanism?

2. **Version bump semantics?** The Zig rewrite is not an upstream version change — it is a reimplementation. How should this be reflected in the npm version?

3. **Windows parity?** The Zig build has Windows DLL support. Is this at the same maturity level as macOS/Linux?

4. **Transition timeline?** Is there a deprecation period for C/Rust artifacts, or is this a clean cut-over?
