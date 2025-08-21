# Maestro E2E Tests for Demo Expo App 🎯

## Setup

1. Install Maestro CLI:
```bash
curl -fsSL https://get.maestro.mobile.dev | bash
```

## Running Tests Locally

### Native Tests (iOS/Android):
```bash
# Run all native tests
maestro test .maestro

# Run specific test
maestro test .maestro/home.yml

# Run by tag
maestro test .maestro --include-tags smoke
```

### Web Tests:
```bash
# Start Expo web server first
npx expo start --web

# In another terminal, run web tests
maestro -p web test .maestro/web

# Or use the helper script
./.maestro/run_tests.sh web
```

### Cross-Platform Tests:
```bash
# Run on native
maestro test .maestro/cross_platform.yml

# Run on web
maestro -p web test .maestro/cross_platform.yml

# Run all platforms
./.maestro/run_tests.sh all
```

## Test Structure

```
.maestro/
├── config.yaml              # Native config with env vars and tags
├── home.yml                # Home screen tests
├── navigation.yml          # Tab navigation tests
├── explore.yml             # Explore screen tests
├── modal.yml               # Modal interaction tests
├── smoke_test.yml          # Quick smoke test
├── cross_platform.yml      # Tests that work on both native and web
├── run_tests.sh           # Helper script to run tests on all platforms
├── web/                    # Web-specific tests
│   ├── config.yaml        # Web config with URL
│   ├── smoke_test.yml     # Web smoke test
│   ├── navigation.yml     # Web navigation test
│   └── responsive.yml     # Web responsive behavior
├── subflows/
│   └── test_collapsibles.yml  # Reusable flow for testing collapsibles
└── data/
    └── test_data.json      # Test data for parameterized tests
```

## CI/CD Integration

### EAS Workflows

Add to `.eas/workflows/e2e-test.yml`:

```yaml
name: e2e-test
on:
  pull_request:
    branches: ['*']
jobs:
  build_for_e2e:
    type: build
    params:
      platform: ios  # or android
      profile: e2e-test
  maestro_test:
    needs: [build_for_e2e]
    type: maestro
    params:
      build_id: ${{ needs.build_for_e2e.outputs.build_id }}
      flow_path: ['packages-native/demo-expo/.maestro']
```

### GitHub Actions

```yaml
- name: Run Maestro Tests
  uses: mobile-dev-inc/action-maestro-cloud@v1
  with:
    api-key: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
    app-file: path/to/app.apk  # or .app for iOS
    workspace: packages-native/demo-expo/.maestro
```

## Writing New Tests

1. Create a new `.yml` file in `.maestro/`
2. Start with the app ID and tags:
```yaml
appId: ${APP_ID}
tags:
  - your_tag
---
```
3. Add test steps using Maestro commands
4. Use subflows for reusable test logic
5. Store test data in `data/` directory

## Tips

- Use `takeScreenshot` to capture visual bugs
- Use `optional: true` for elements that might not always be visible
- Use `scrollUntilVisible` for elements below the fold
- Keep flows focused on one user journey
- Use meaningful tags for test organization