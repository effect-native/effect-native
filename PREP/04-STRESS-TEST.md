# Stress Test

- The beta update may change unstable SQL or platform APIs and require source migration.
- Lockfile regeneration may pull unrelated transitive updates that break tooling.
- Native SQLite addons may expose an ABI mismatch during the full `ok` gate.
- Doc examples may compile against APIs not exercised by normal package builds.
- A pre-existing PR may point at a rebased history and require force-with-lease.
