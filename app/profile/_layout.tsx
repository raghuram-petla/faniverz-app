import { Stack } from 'expo-router';

// @boundary Profile sub-screens layout — headerless stack for edit, account, settings, etc.
// @coupling Expo Router auto-discovers screens in profile/ directory; each file becomes a route
export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
