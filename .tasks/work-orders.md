# Current Work Orders

1. Record the adversarial code-review and Thing Golf artifacts for the committed
   beta.99 refresh.
   - done_when: `test -f .tasks/code-review/effect-native/v4-refresh/$(git rev-parse HEAD)/03-public-response.md`
2. Push `v4-refresh` and refresh ready PR #282 into `v4`.
   - done_when: `gh pr list --repo effect-native/effect-native --head v4-refresh --base v4 --state open --json number,url`
