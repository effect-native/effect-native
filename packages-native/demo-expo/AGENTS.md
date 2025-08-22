# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is an Expo demo application within the effect-native fork repository. It's an Expo 53 project using React Native 0.79.6 with React 19, configured with file-based routing via expo-router and React Navigation for tab navigation.

## Development Commands

### Running the App
```bash
pnpm start              # Start Expo development server
pnpm ios               # Start on iOS simulator
pnpm android           # Start on Android emulator
pnpm web               # Start in web browser
```

### Code Quality
```bash
pnpm lint              # Run ESLint with Expo config
```

### Project Reset
```bash
pnpm reset-project     # Move starter code to app-example/ and create blank app/
```

## Architecture

### Project Structure

The app uses Expo's file-based routing system:
- `app/`: Contains all routes and navigation structure
  - `(tabs)/`: Tab-based navigation screens
  - `_layout.tsx`: Root layout with theme provider and font loading
  - `+not-found.tsx`: 404 screen
- `components/`: Reusable UI components with theming support
  - `ui/`: Platform-specific UI components
- `hooks/`: Custom React hooks for color scheme and theming
- `constants/`: App constants including color definitions
- `assets/`: Static assets (fonts, images, icons)

### Key Patterns

1. **Theming**: Automatic dark/light mode support via `useColorScheme` hook and `ThemeProvider`
2. **Platform-specific code**: Separate `.ios.tsx` files for iOS-specific implementations
3. **Typed routes**: Enabled via `experiments.typedRoutes` in app.json
4. **Path aliasing**: `@/` resolves to project root for cleaner imports
5. **Tab navigation**: Bottom tabs with haptic feedback and platform-specific styling

### Configuration

- **TypeScript**: Strict mode enabled, extends Expo's base config
- **ESLint**: Uses `eslint-config-expo` flat config
- **Metro bundler**: Configured for web output as static files
- **New Architecture**: React Native's new architecture enabled (`newArchEnabled: true`)

### Dependencies

Core libraries include:
- `expo-router`: File-based routing
- `@react-navigation`: Navigation system
- `react-native-reanimated`: Animations
- `react-native-gesture-handler`: Gesture handling
- `expo-constants`, `expo-font`, `expo-haptics`: Expo SDK modules