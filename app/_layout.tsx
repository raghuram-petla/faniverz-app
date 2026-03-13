import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Exo2_800ExtraBold_Italic } from '@expo-google-fonts/exo-2';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/features/auth/providers/AuthProvider';
import { ImageViewerProvider } from '@/providers/ImageViewerProvider';
import { ThemeProvider, useTheme } from '@/theme';
import { usePushToken } from '@/features/notifications/usePushToken';
import { useNotificationHandler } from '@/features/notifications/useNotificationHandler';
import { useAnimationStore } from '@/stores/useAnimationStore';

// @invariant: must be called at module scope (not inside a component) — if called
// inside RootLayout, the splash screen flickers because the component mounts after
// React renders a blank frame. Expo docs require this at the top level.
SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const { theme, isDark } = useTheme();
  usePushToken();
  useNotificationHandler();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'none',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="movie/[id]" />
        <Stack.Screen name="actor/[id]" />
        <Stack.Screen name="discover" />
        <Stack.Screen name="search" />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen name="production-house/[id]" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="profile" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Exo2_800ExtraBold_Italic });

  // @edge: loadFromStorage() runs on every fontsLoaded change, including the initial
  // false->true transition. It reads the user's animation preferences from AsyncStorage.
  // If AsyncStorage is slow (cold launch), animations may briefly use defaults before
  // the stored preferences load. This is a visual-only race, not a data issue.
  // @sideeffect: SplashScreen.hideAsync() is idempotent — calling it when already
  // hidden is a no-op. But if fontsLoaded is false and this effect runs, hideAsync
  // is NOT called (guarded by if), keeping the splash screen visible.
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
    useAnimationStore.getState().loadFromStorage();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // @invariant: provider ordering matters — ImageViewerProvider must be INSIDE
  // AuthProvider (it may need auth state for image URLs) and QueryClientProvider
  // (image viewer may trigger queries). GestureHandlerRootView must be the outermost
  // wrapper or gesture-based interactions (swipe to dismiss, pinch to zoom) fail
  // silently on Android.
  // @coupling: queryClient is a module-level singleton from @/lib/queryClient — same
  // instance is shared across hot reloads in development. In production, a new instance
  // is created per app launch.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ImageViewerProvider>
              <ThemedStack />
            </ImageViewerProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
