# Theoretical Framework

The refresh is safe when it preserves the repo's public intent while updating only the dependency compatibility layer required by the new beta.

The implementation strategy is:

1. Move the lockfile to the current Effect beta family.
2. Replace removed upstream APIs with their documented v4 equivalents.
3. Keep error pathways explicit through Effect failures and structured errors.
4. Use schema constructor validation for typed metadata rather than unsafe construction.
5. Prove behavior through typecheck, package tests, full tests, docgen, and `bun run ok`.
