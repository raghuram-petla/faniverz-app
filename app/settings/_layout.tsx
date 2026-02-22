import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="notifications" options={{ title: 'Notification Settings' }} />
      <Stack.Screen name="language" options={{ title: 'Language' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
    </Stack>
  );
}
