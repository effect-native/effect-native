# en-rn-test-runner — Split Notice

This spec has been split into multiple Phase 1 instruction specs to improve clarity and separation of concerns and to reflect the implementation order:

- Portable SPI (define once, run anywhere): `.specs/portable-test-spi/instructions.md`
- Adapters — vitest + bun:first: `.specs/test-runners-vitest-bun/instructions.md`
- Adapter — Browser (next): `.specs/test-runner-browser/instructions.md`
- Adapter — React Native (then): `.specs/test-runner-react-native/instructions.md`

Please refer to those specs for the up‑to‑date Instructions Phase content. Subsequent phases (requirements, design, plan) should be created under those two directories.
