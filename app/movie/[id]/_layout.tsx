import { Stack } from 'expo-router';

export default function MovieLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="media" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
