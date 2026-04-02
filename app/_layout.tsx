import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Exo2_800ExtraBold_Italic } from '@expo-google-fonts/exo-2';
import { queryClient, queryPersister } from '@/lib/queryClient';
import { AuthProvider } from '@/features/auth/providers/AuthProvider';
import { ImageViewerProvider } from '@/providers/ImageViewerProvider';
import { ThemeProvider, useTheme } from '@/theme';
import { usePushToken } from '@/features/notifications/usePushToken';
import { useNotificationHandler } from '@/features/notifications/useNotificationHandler';
import { useAnimationStore } from '@/stores/useAnimationStore';
import { useFilmStripStore } from '@/stores/useFilmStripStore';
import { languageReady } from '@/i18n';

const SPLASH_MIN_MS = 500;

// @invariant: must be called at module scope (not inside a component) — if called
// inside RootLayout, the splash screen flickers because the component mounts after
// React renders a blank frame. Expo docs require this at the top level.
SplashScreen.preventAutoHideAsync();

const ROOT_STYLE = { flex: 1 } as const;

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
  const [i18nReady, setI18nReady] = useState(false);
  const [cacheRestored, setCacheRestored] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const splashHiddenRef = useRef(false);

  // @sync: wait for i18n to load stored language preference before rendering,
  // otherwise translation keys (e.g. "tabs.home") appear as raw strings.
  useEffect(() => {
    languageReady.then(() => setI18nReady(true));
  }, []);

  // @contract Enforce 500ms minimum splash so it feels intentional, not glitchy.
  // Behind the splash: fonts load, i18n resolves, cache restores, auth checks session.
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  // @sideeffect Load animation/filmstrip preferences from AsyncStorage on mount.
  useEffect(() => {
    useAnimationStore.getState().loadFromStorage();
    useFilmStripStore.getState().loadFromStorage();
  }, []);

  // @contract Hide splash only when ALL conditions are met: fonts loaded, i18n ready,
  // cache restored from disk, and minimum display time elapsed. This ensures the user
  // transitions from splash directly to a fully rendered feed — no skeleton, no empty state.
  const allReady = fontsLoaded && i18nReady && cacheRestored && minTimeElapsed;
  useEffect(() => {
    if (allReady && !splashHiddenRef.current) {
      splashHiddenRef.current = true;
      SplashScreen.hideAsync();
    }
  }, [allReady]);

  // @sideeffect Called by PersistQueryClientProvider after cache restoration completes.
  // Invalidates all restored queries to trigger background refetch for stale data.
  const handleCacheRestored = useCallback(() => {
    setCacheRestored(true);
    queryClient.invalidateQueries();
  }, []);

  // @contract No early return — all providers mount immediately so cache restoration,
  // auth session check, and feed queries all start at t=0 behind the splash screen.
  // The splash covers any rendering with missing fonts or raw i18n keys.
  // SplashScreen.hideAsync() only fires after allReady (fonts + i18n + cache + 500ms).
  return (
    <GestureHandlerRootView style={ROOT_STYLE}>
      <ThemeProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: queryPersister }}
          onSuccess={handleCacheRestored}
        >
          <AuthProvider>
            <ImageViewerProvider>
              {fontsLoaded && i18nReady ? <ThemedStack /> : null}
            </ImageViewerProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
