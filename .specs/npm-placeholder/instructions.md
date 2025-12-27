# @effect-native/npm-placeholder Instructions

## Context

Claiming npm package names is a common need when planning a monorepo or package ecosystem. The process involves:
1. Verifying npm authentication (including 2FA)
2. Checking package name availability
3. Creating and publishing a minimal placeholder package

Currently, this requires manual steps: creating a temp directory, writing package.json, running npm publish, handling auth failures, and managing 2FA flows. The existing `npm-snipe` specification (see `/npm-snipe/npm-snipe.md`) describes this process in detail using raw Bun APIs.

However, the Effect ecosystem lacks a proper CLI tool for this. By implementing it with `@effect/cli`, we get:
- Composable command structure with proper argument parsing
- Type-safe error handling
- Testable layers for all external dependencies
- Consistent logging and user feedback

This package will also serve as a reference implementation demonstrating `@effect/cli` usage patterns for native Effect projects.

## User Story

**As a** developer managing npm packages in an Effect-native ecosystem,
**I want** a CLI tool that handles npm package name claiming with automatic auth and 2FA,
**So that** I can quickly reserve package names without manual boilerplate.

## High-Level Goals

1. **Provide a single CLI command** to publish placeholder packages
   - Accept package name as required argument
   - Accept optional version (default: 0.0.1-placeholder)
   - Handle scoped and unscoped packages

2. **Handle authentication automatically**
   - Verify npm login status
   - Cache credentials securely using Bun.secrets
   - Create granular tokens when 2FA is required
   - Support WebAuthn/YubiKey browser-based 2FA flow

3. **Provide clear feedback**
   - Show progress through each step
   - Display actionable error messages
   - Report success with package URLs

4. **Follow Effect/CLI patterns**
   - Use Command/Args/Options from @effect/cli
   - Use Layer-based services for testability
   - Tagged errors with Effect patterns

5. **Integrate with persistence-secrets**
   - Use the Persistence layer backed by Bun.secrets
   - Abstract credential storage for testability

## Out of Scope

### For v1.0

- **Batch publishing** - One package per invocation
- **Package deprecation** - Use npm deprecate directly
- **Package transfer** - Use npm access directly
- **Version bumping** - Placeholder versions only
- **Package.json templates** - Only minimal placeholder

### Permanently Out of Scope

- **npm login implementation** - Users run `npm login` themselves
- **npm account management** - Different concern
- **Registry mirroring** - Infrastructure concern
- **CI/CD integration** - Use this as a building block
