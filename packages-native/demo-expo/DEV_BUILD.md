# Development Build Setup 🚀

This app uses Expo development builds instead of Expo Go for a rootin' tootin' native experience.

## Initial Setup

1. **Install dependencies:**
```bash
pnpm install
```

2. **Install EAS CLI globally (if not installed):**
```bash
npm install -g eas-cli
```

3. **Login to Expo (optional, for cloud builds):**
```bash
eas login
```

## Local Development

### iOS Simulator

1. **Prebuild the native project:**
```bash
pnpm prebuild
```

2. **Run on iOS simulator:**
```bash
pnpm ios
```

### Android Emulator

1. **Prebuild the native project:**
```bash
pnpm prebuild
```

2. **Run on Android emulator:**
```bash
pnpm android
```

### Web

Web doesn't need a dev build:
```bash
pnpm web
```

## Building Dev Clients

### Local builds (faster, requires native toolchain):
```bash
# iOS (requires Xcode)
pnpm ios

# Android (requires Android Studio)
pnpm android
```

### Cloud builds with EAS:
```bash
# iOS development build
pnpm build:ios

# Android development build  
pnpm build:android
```

## Testing

```bash
# Run Vitest unit tests
pnpm test

# Run Maestro E2E tests
pnpm test:ios      # iOS simulator
pnpm test:android  # Android emulator
pnpm test:web      # Web browser
```

## Why Dev Builds?

- **Native modules**: Full access to native APIs
- **Custom native code**: Can add custom native modules
- **Debugging**: Better debugging experience
- **Performance**: Production-like performance
- **Testing**: Maestro tests require dev builds (not Expo Go)

## Troubleshooting

- If you see "Development build not installed", run `pnpm prebuild && pnpm ios/android`
- Clear cache: `npx expo start --clear`
- Clean prebuild: `pnpm prebuild`
- Check native logs: `npx react-native log-ios` or `npx react-native log-android`