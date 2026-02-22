import * as fs from 'fs';
import * as path from 'path';

describe('Core Dependencies', () => {
  const packageJsonPath = path.resolve(__dirname, '../../package.json');
  let pkg: Record<string, unknown>;
  let deps: Record<string, string>;

  beforeAll(() => {
    const raw = fs.readFileSync(packageJsonPath, 'utf-8');
    pkg = JSON.parse(raw);
    deps = {
      ...(pkg.dependencies as Record<string, string>),
      ...(pkg.devDependencies as Record<string, string>),
    };
  });

  const criticalDeps = [
    'expo',
    'expo-router',
    '@supabase/supabase-js',
    '@react-native-async-storage/async-storage',
    'expo-secure-store',
    '@tanstack/react-query',
    'zustand',
    'date-fns',
    'react-native-reanimated',
    'expo-image',
    'expo-image-picker',
    '@shopify/flash-list',
    'expo-linking',
    'expo-haptics',
    'expo-sharing',
    'expo-font',
    'expo-localization',
    'expo-splash-screen',
    'expo-notifications',
    'expo-device',
    'i18next',
    'react-i18next',
    'react-native-youtube-iframe',
    '@react-native-community/netinfo',
    'react-native-screens',
    'react-native-safe-area-context',
    'react-native-gesture-handler',
    'expo-constants',
    'react-native-worklets',
  ];

  it.each(criticalDeps)('%s is installed', (dep) => {
    expect(deps[dep]).toBeDefined();
  });

  it('has TypeScript as a devDependency', () => {
    const devDeps = pkg.devDependencies as Record<string, string>;
    expect(devDeps.typescript).toBeDefined();
  });

  it('node_modules contains expo', () => {
    const expoPath = path.resolve(__dirname, '../../node_modules/expo/package.json');
    expect(fs.existsSync(expoPath)).toBe(true);
  });
});
