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

type IconName = keyof typeof Ionicons.glyphMap;

interface ToggleRow {
  kind: 'toggle';
  icon: IconName;
  label: string;
  key: string;
}

interface LinkRow {
  kind: 'link';
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
}

interface RadioRow {
  kind: 'radio';
  icon: IconName;
  label: string;
  options: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
}

type SettingsRow = ToggleRow | LinkRow | RadioRow;

interface Section {
  title: string;
  rows: SettingsRow[];
}

const THEME_OPTIONS: { key: string; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, mode, setMode } = useTheme();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.PUSH_NOTIFICATIONS).then((v) => {
      if (v !== null) setPushEnabled(v === 'true');
    });
    AsyncStorage.getItem(STORAGE_KEYS.EMAIL_NOTIFICATIONS).then((v) => {
      if (v !== null) setEmailEnabled(v === 'true');
    });
  }, []);

  const togglePush = () => {
    setPushEnabled((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEYS.PUSH_NOTIFICATIONS, String(next));
      return next;
    });
  };

  const toggleEmail = () => {
    setEmailEnabled((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEYS.EMAIL_NOTIFICATIONS, String(next));
      return next;
    });
  };

  const toggleMap: Record<string, { value: boolean; setter: () => void }> = {
    push: { value: pushEnabled, setter: togglePush },
    email: { value: emailEnabled, setter: toggleEmail },
  };

  const isLoggedIn = !!user;

  const sections: Section[] = [
    {
      title: 'Appearance',
      rows: [
        {
          kind: 'radio',
          icon: 'sunny-outline',
          label: 'Theme',
          options: THEME_OPTIONS,
          selected: mode,
          onSelect: (key: string) => setMode(key as 'system' | 'light' | 'dark'),
        },
      ],
    },
    ...(isLoggedIn
      ? [
          {
            title: 'Notifications',
            rows: [
              {
                kind: 'toggle' as const,
                icon: 'notifications-outline' as IconName,
                label: 'Push Notifications',
                key: 'push',
              },
              {
                kind: 'toggle' as const,
                icon: 'mail-outline' as IconName,
                label: 'Email Notifications',
                key: 'email',
              },
            ],
          },
          {
            title: 'Privacy',
            rows: [
              {
                kind: 'link' as const,
                icon: 'lock-closed-outline' as IconName,
                label: 'Change Password',
                onPress: () => router.push('/profile/change-password'),
              },
              {
                kind: 'link' as const,
                icon: 'shield-outline' as IconName,
                label: 'Privacy Settings',
                onPress: () => router.push('/profile/privacy'),
              },
            ],
          },
        ]
      : []),
    {
      title: 'Preferences',
      rows: [
        {
          kind: 'link',
          icon: 'language-outline',
          label: 'Language',
          value: language === 'te' ? 'Telugu' : 'English',
          onPress: () => router.push('/profile/language'),
        },
      ],
    },
    {
      title: 'About',
      rows: [
        {
          kind: 'link',
          icon: 'chatbubble-ellipses-outline',
          label: 'FAQ',
          onPress: () => router.push('/profile/faq'),
        },
        {
          kind: 'link',
          icon: 'help-circle-outline',
          label: 'Help & Support',
          onPress: () => Linking.openURL('mailto:faniverz@gmail.com?subject=Faniverz%20Support'),
        },
        {
          kind: 'link',
          icon: 'document-text-outline',
          label: 'Terms of Service',
          onPress: () => router.push('/profile/legal?type=terms'),
        },
        {
          kind: 'link',
          icon: 'eye-outline',
          label: 'Privacy Policy',
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
      <ScreenHeader title="Settings" />

      {/* Sections */}
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.rows.map((row, index) => {
              const isLast = index === section.rows.length - 1;
              if (row.kind === 'toggle') {
                const toggle = toggleMap[row.key];
                return (
                  <View key={row.label} style={[styles.row, !isLast && styles.rowBorder]}>
                    <View style={styles.rowLeft}>
                      <View style={styles.iconWrapper}>
                        <Ionicons name={row.icon} size={18} color={theme.textSecondary} />
                      </View>
                      <Text style={styles.rowLabel}>{row.label}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={toggle.setter}
                      activeOpacity={0.8}
                      style={[styles.toggle, toggle.value ? styles.toggleOn : styles.toggleOff]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          toggle.value ? styles.toggleThumbOn : styles.toggleThumbOff,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>
                );
              }
              if (row.kind === 'radio') {
                return (
                  <View key={row.label} style={[styles.radioRow, !isLast && styles.rowBorder]}>
                    <View style={styles.radioHeader}>
                      <View style={styles.iconWrapper}>
                        <Ionicons name={row.icon} size={18} color={theme.textSecondary} />
                      </View>
                      <Text style={styles.rowLabel}>{row.label}</Text>
                    </View>
                    <View style={styles.radioOptions}>
                      {row.options.map((opt) => {
                        const isSelected = opt.key === row.selected;
                        return (
                          <TouchableOpacity
                            key={opt.key}
                            style={[styles.radioChip, isSelected && styles.radioChipSelected]}
                            activeOpacity={1}
                            onPress={() => row.onSelect(opt.key)}
                          >
                            <Text
                              style={[
                                styles.radioChipText,
                                isSelected && styles.radioChipTextSelected,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              }
              // link row
              return (
                <TouchableOpacity
                  key={row.label}
                  style={[styles.row, !isLast && styles.rowBorder]}
                  activeOpacity={0.7}
                  onPress={row.onPress}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.iconWrapper}>
                      <Ionicons name={row.icon} size={18} color={theme.textSecondary} />
                    </View>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
                    <Ionicons name="chevron-forward" size={16} color={theme.textDisabled} />
                  </View>
                </TouchableOpacity>
              );
            })}
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
