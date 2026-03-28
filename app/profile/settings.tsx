import { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useTheme } from '@/theme';
import ScreenHeader from '@/components/common/ScreenHeader';
import { createStyles } from '@/styles/profile/settings.styles';
import { STORAGE_KEYS } from '@/constants/storage';
import { useTranslation } from 'react-i18next';
import { useAnimationStore } from '@/stores/useAnimationStore';
import { useFilmStripStore } from '@/stores/useFilmStripStore';
import { SettingsRowItem } from '@/components/profile/SettingsRowItem';
import type { IconName, Section } from '@/components/profile/settingsTypes';

// @boundary: Settings hub — appearance, notifications, privacy, preferences, and about links
// @coupling: useTheme (mode setter), useAnimationStore, AsyncStorage (push/email prefs), i18n
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, mode, setMode } = useTheme();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const themeOptions = useMemo(
    () => [
      { key: 'system', label: t('settings.system') },
      { key: 'light', label: t('settings.light') },
      { key: 'dark', label: t('settings.dark') },
    ],
    [t],
  );

  const { animationsEnabled, setAnimationsEnabled } = useAnimationStore();
  const { filmStripEnabled, setFilmStripEnabled } = useFilmStripStore();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  // @sync: Notification prefs stored locally via AsyncStorage — no backend table
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEYS.PUSH_NOTIFICATIONS)
      .then((v) => {
        if (mounted && v !== null) setPushEnabled(v === 'true');
      })
      .catch(() => {});
    AsyncStorage.getItem(STORAGE_KEYS.EMAIL_NOTIFICATIONS)
      .then((v) => {
        if (mounted && v !== null) setEmailEnabled(v === 'true');
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const toggleAsync = (key: string, cur: boolean, set: (v: boolean) => void) => {
    set(!cur);
    AsyncStorage.setItem(key, String(!cur));
  };
  // @coupling: toggle keys must match the 'key' field in section row definitions below
  const toggleMap: Record<string, { value: boolean; setter: () => void }> = {
    push: {
      value: pushEnabled,
      setter: () => toggleAsync(STORAGE_KEYS.PUSH_NOTIFICATIONS, pushEnabled, setPushEnabled),
    },
    email: {
      value: emailEnabled,
      setter: () => toggleAsync(STORAGE_KEYS.EMAIL_NOTIFICATIONS, emailEnabled, setEmailEnabled),
    },
    animations: {
      value: animationsEnabled,
      setter: () => setAnimationsEnabled(!animationsEnabled),
    },
    filmStrip: {
      value: filmStripEnabled,
      setter: () => setFilmStripEnabled(!filmStripEnabled),
    },
  };

  const isLoggedIn = !!user;

  // @contract: notification and privacy sections only appear when user is logged in
  const sections: Section[] = [
    {
      title: t('settings.appearance'),
      rows: [
        {
          kind: 'radio',
          icon: 'sunny-outline',
          label: t('settings.theme'),
          options: themeOptions,
          selected: mode,
          onSelect: (key: string) => setMode(key as 'system' | 'light' | 'dark'),
        },
        {
          kind: 'toggle' as const,
          icon: 'sparkles-outline' as IconName,
          label: t('settings.animations'),
          key: 'animations',
        },
        {
          kind: 'toggle' as const,
          icon: 'film-outline' as IconName,
          label: t('settings.filmStrip'),
          key: 'filmStrip',
        },
      ],
    },
    ...(isLoggedIn
      ? [
          {
            title: t('settings.notificationSection'),
            rows: [
              {
                kind: 'toggle' as const,
                icon: 'notifications-outline' as IconName,
                label: t('settings.pushNotifications'),
                key: 'push',
              },
              {
                kind: 'toggle' as const,
                icon: 'mail-outline' as IconName,
                label: t('settings.emailNotifications'),
                key: 'email',
              },
            ],
          },
          {
            title: t('settings.privacySection'),
            rows: [
              {
                kind: 'link' as const,
                icon: 'lock-closed-outline' as IconName,
                label: t('settings.changePassword'),
                onPress: () => router.push('/profile/change-password'),
              },
              {
                kind: 'link' as const,
                icon: 'shield-outline' as IconName,
                label: t('settings.privacySettings'),
                onPress: () => router.push('/profile/privacy'),
              },
            ],
          },
        ]
      : []),
    {
      title: t('settings.preferences'),
      rows: [
        {
          kind: 'link',
          icon: 'language-outline',
          label: t('settings.language'),
          value: language === 'te' ? 'Telugu' : 'English',
          onPress: () => router.push('/profile/language'),
        },
      ],
    },
    {
      title: t('settings.about'),
      rows: [
        {
          kind: 'link',
          icon: 'chatbubble-ellipses-outline',
          label: t('settings.faq'),
          onPress: () => router.push('/profile/faq'),
        },
        {
          kind: 'link',
          icon: 'help-circle-outline',
          label: t('settings.helpSupport'),
          onPress: () => Linking.openURL('mailto:faniverz@gmail.com?subject=Faniverz%20Support'),
        },
        {
          kind: 'link',
          icon: 'document-text-outline',
          label: t('settings.termsOfService'),
          onPress: () => router.push('/profile/legal?type=terms'),
        },
        {
          kind: 'link',
          icon: 'eye-outline',
          label: t('settings.privacyPolicy'),
          onPress: () => router.push('/profile/legal?type=privacy'),
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <ScreenHeader title={t('settings.title')} />

      {/* Sections */}
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.rows.map((row, index) => (
              <SettingsRowItem
                key={row.label}
                row={row}
                isLast={index === section.rows.length - 1}
                styles={styles}
                theme={theme}
                toggleMap={toggleMap}
              />
            ))}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerVersion}>
          Faniverz v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
        <Text style={styles.footerBuild}>
          {Constants.expoConfig?.extra?.buildDate ?? '2026.03.11'}
        </Text>
      </View>
    </ScrollView>
  );
}
