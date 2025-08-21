// This file is only used when using the development client
// It's not used with Expo Router, which uses expo-router/entry
import 'expo-dev-client';
import { registerRootComponent } from 'expo';

// Import the expo-router entry point
import App from 'expo-router/entry';

// Register the app
registerRootComponent(App);