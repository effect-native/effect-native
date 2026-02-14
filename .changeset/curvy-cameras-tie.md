---
"@effect-native/fetch-hooks": patch
---

Fix SSE cache persistence so streaming responses return immediately while still being recorded safely to cache.

Also harden cache tests against concurrent execution by isolating filesystem storage per test and removing shared cache-dir races.
