---
title: "Impl: Onboard v4 core packages to npm trusted publishing"
status: blocked
done_when: |
  - npm trusted publisher is configured for effect-native/effect-native
    .github/workflows/release.yml on all blocked packages:
    - effect-native
    - @effect-native/debug
    - @effect-native/patterns
    - @effect-native/schemas
  - Release workflow on branch v4 publishes 4.0.0 for the blocked packages
    and exits with status success.
basis: |
  Blocked on Tom for npm account-level actions that cannot be completed from
  repository code: package onboarding and trusted publisher/OIDC setup.

  Evidence:
  - Release run 22321133385 returned npm OIDC exchange POST 404 for:
    effect-native, @effect-native/debug, @effect-native/patterns,
    @effect-native/schemas.
  - Blocked packages are temporarily marked private in-repo so release can
    continue publishing other packages until npm setup is complete.
  - Remaining non-private packages already have current target versions
    published (for example @effect-native/bun-test@4.0.0, @effect-native/crsql@4.0.0,
    @effect-native/fetch-hooks@4.0.0, @effect-native/libcrsql@4.0.0,
    @effect-native/libsqlite@4.0.0, @effect-native/tui-testing-library@4.0.0).
blocked_by: []
artifacts:
  - path: packages/effect-native/package.json
    description: Temporarily private while npm trusted publishing setup is pending.
  - path: packages/debug/package.json
    description: Temporarily private while npm trusted publishing setup is pending.
  - path: packages/patterns/package.json
    description: Temporarily private while npm trusted publishing setup is pending.
  - path: packages/schemas/package.json
    description: Temporarily private while npm trusted publishing setup is pending.
  - path: .github/workflows/release.yml
    description: OIDC diagnostics and publish workflow used to validate failure mode.
---

# Impl: Onboard v4 core packages to npm trusted publishing

This task is blocked on Tom.

## Requested manual actions

1. Create npm package entries if they are missing.
2. Configure npm Trusted Publishers (OIDC) for:
   - `effect-native`
   - `@effect-native/debug`
   - `@effect-native/patterns`
   - `@effect-native/schemas`
3. Re-run the `Release` workflow on `v4`.

## Why this is blocked

Repository changes and workflow updates already confirm npm OIDC context is
present (`id-token: write`, npm `11.10.1`, OIDC request env present). Publish
still fails only on the package exchange endpoint with 404 for the four package
names above, which requires npm-side configuration by a package owner.
