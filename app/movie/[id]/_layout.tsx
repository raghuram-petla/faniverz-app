import { Stack } from 'expo-router';

// @contract: layout for movie/[id] segment — allows index.tsx and media.tsx
// to coexist as sibling routes under the same dynamic [id] parameter.
export default function MovieLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="media" />
    </Stack>
  );
}
