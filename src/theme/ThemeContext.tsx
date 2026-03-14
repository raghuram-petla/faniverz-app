import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme, LayoutAnimation, Platform, UIManager, Appearance } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAnimationStore } from '@/stores/useAnimationStore';
import { colors } from '@shared/colors';
import { darkTheme, lightTheme, type SemanticTheme, type ThemeMode } from '@shared/themes';
import { STORAGE_KEYS } from '@/constants/storage';

interface ThemeContextValue {
  theme: SemanticTheme;
  colors: typeof colors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  colors,
  isDark: true,
  mode: 'system',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // @coupling reads useAnimationStore outside React lifecycle — getState() bypasses subscriptions intentionally
  const setMode = useCallback((newMode: ThemeMode) => {
    if (useAnimationStore.getState().animationsEnabled) {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          300,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity,
        ),
      );
    }
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, newMode);
  }, []);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  // @sideeffect Syncs React Native's Appearance with the app's selected theme so iOS
  // renders correct status bar icon colors even when app theme differs from system theme
  useEffect(() => {
    Appearance.setColorScheme(mode === 'system' ? null : mode);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: isDark ? darkTheme : lightTheme,
      colors,
      isDark,
      mode,
      setMode,
    }),
    [isDark, mode, setMode],
  );

  // @contract: renders children with system-derived theme even before AsyncStorage loads,
  // preventing blank screen flicker. Once loaded, the saved preference takes effect.
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
