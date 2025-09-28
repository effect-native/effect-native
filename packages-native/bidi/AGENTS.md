# @effect-native/bidi Contribution Guide

## Documentation
- JSDoc for every exported symbol must link to the relevant section of the [WebDriver BiDi draft specification](https://w3c.github.io/webdriver-bidi/) using a deep link (e.g. `#commands`, `#events`, `#transport`).
- When adding new exports, cite the spec anchor with `@see` so docgen consumers can trace the provenance quickly.

## Specs Folder Hygiene
- Keep `.specs/bidi` synchronized with implementation progress; create or update research notes as soon as experiments are run.
- Reference research documents from code comments when behavior is grounded in experimentation.

## Testing & Tooling
- Run `nix develop --command pnpm --filter @effect-native/bidi test` for package-level changes.
- Run `nix develop --command pnpm lint --fix` after touching TypeScript sources.
