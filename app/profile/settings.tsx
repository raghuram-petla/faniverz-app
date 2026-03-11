import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useTheme } from '@/theme';
import ScreenHeader from '@/components/common/ScreenHeader';
import { createStyles } from '@/styles/profile/settings.styles';

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
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  const toggleMap: Record<string, { value: boolean; setter: () => void }> = {
    push: { value: pushEnabled, setter: () => setPushEnabled((v) => !v) },
    email: { value: emailEnabled, setter: () => setEmailEnabled((v) => !v) },
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
                onPress: () => Alert.alert('Coming Soon', 'This feature is not yet available.'),
              },
              {
                kind: 'link' as const,
                icon: 'shield-outline' as IconName,
                label: 'Privacy Settings',
                onPress: () => Alert.alert('Coming Soon', 'This feature is not yet available.'),
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
          value: 'English',
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
          onPress: () => Alert.alert('Coming Soon', 'This feature is not yet available.'),
        },
        {
          kind: 'link',
          icon: 'document-text-outline',
          label: 'Terms of Service',
          onPress: () => Alert.alert('Coming Soon', 'This feature is not yet available.'),
        },
        {
          kind: 'link',
          icon: 'eye-outline',
          label: 'Privacy Policy',
          onPress: () => Alert.alert('Coming Soon', 'This feature is not yet available.'),
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

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerVersion}>Faniverz v1.0.0</Text>
        <Text style={styles.footerBuild}>Build 2024.02.23</Text>
      </View>
    </ScrollView>
  );
}
