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

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
    useAnimationStore.getState().loadFromStorage();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
