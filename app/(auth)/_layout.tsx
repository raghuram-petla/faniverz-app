import { Stack } from 'expo-router';

// @boundary Auth group layout — headerless stack for login, register, and forgot-password
// @coupling Expo Router auto-discovers screens in (auth)/ directory; adding new files adds new routes
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />;
}
