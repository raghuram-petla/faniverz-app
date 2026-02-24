import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/features/auth/providers/AuthProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#000' },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="movie/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="discover" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="search" options={{ animation: 'fade' }} />
            <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="profile" />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
