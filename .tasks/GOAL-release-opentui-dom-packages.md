---
title: Release opentui-dom and opentui-dom-testing-library
status: triage
done_when: |
  - pnpm ok passes with no errors
  - Both packages build successfully with build-utils pack-v3
  - All tests pass
  - Packages are unprivated and published to npm
basis: |
  Created 2024-12-29. Packages exist but are marked private.
  Blocked on tui-testing-library release for coordinated release strategy.
blocked_by:
  - .tasks/GOAL-release-tui-testing-library.md
artifacts:
  - path: packages-native/opentui-dom
    description: Effect-based DOM adapter interface for unified DOM access across environments
  - path: packages-native/opentui-dom-testing-library
    description: Testing utilities for rendering React components in happy-dom
---

# GOAL: Release opentui-dom and opentui-dom-testing-library

Prepare `@effect-native/opentui-dom` and `@effect-native/opentui-dom-testing-library` for npm publication.

## Current State

Both packages are marked `private: true` to prevent accidental publication.

### @effect-native/opentui-dom

- Effect-based DOM adapter interface
- Provides DOMAdapter and TestAdapter services
- Bridge utilities for DOM-to-TUI conversion (style-bridge, event-relay, etc.)
- Has LICENSE and README.md

### @effect-native/opentui-dom-testing-library

- Testing utilities similar to @testing-library/react
- Renders React components in happy-dom
- Provides queries, events, and screen utilities
- Has LICENSE and README.md

## Pre-release Checklist

- [ ] Review API surface for both packages
- [ ] Ensure all tests pass
- [ ] Verify package.json metadata (keywords, description, etc.)
- [ ] Check peer dependencies are correct
- [ ] Verify exports are correct
- [ ] Ensure JSDoc documentation is complete
- [ ] Run `pnpm ok` to verify all checks pass

## To Publish

When ready to publish:

1. Remove `"private": true` from both package.json files
2. Ensure `pnpm ok` passes
3. Create changeset with `pnpm changeset`
4. Follow normal release process

## Related

- Blocked by: `.tasks/GOAL-release-tui-testing-library.md`
