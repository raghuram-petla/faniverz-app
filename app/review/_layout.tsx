import { Stack } from 'expo-router';

export default function ReviewLayout() {
  return (
    <Stack>
      <Stack.Screen name="[movieId]" options={{ title: 'Reviews' }} />
      <Stack.Screen
        name="write/[movieId]"
        options={{ title: 'Write Review', presentation: 'modal' }}
      />
    </Stack>
  );
}
