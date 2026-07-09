# Constants

- The repo targets Effect v4 beta.
- The workspace layout is `packages/*`, not `packages-native/*`.
- Public service definitions must use current Effect v4 constructors.
- Type errors must be resolved directly, not hidden with assertions.
- Integration tests must fail loudly; dependency or native-driver failures must not be converted to skips.
- TypeScript edits require `bun run lint-fix`.
- The release base branch for PRs is `v4`.
- `v4-refresh` must be rebased on `origin/v4`.
