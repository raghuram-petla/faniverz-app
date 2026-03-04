import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';
import ScreenHeader from '@/components/common/ScreenHeader';

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

type SettingsRow = ToggleRow | LinkRow;

interface Section {
  title: string;
  rows: SettingsRow[];
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  const toggleMap: Record<string, { value: boolean; setter: () => void }> = {
    push: { value: pushEnabled, setter: () => setPushEnabled((v) => !v) },
    email: { value: emailEnabled, setter: () => setEmailEnabled((v) => !v) },
  };

  const sections: Section[] = [
    {
      title: 'Notifications',
      rows: [
        { kind: 'toggle', icon: 'notifications-outline', label: 'Push Notifications', key: 'push' },
        { kind: 'toggle', icon: 'mail-outline', label: 'Email Notifications', key: 'email' },
      ],
    },
    {
      title: 'Privacy',
      rows: [
        {
          kind: 'link',
          icon: 'lock-closed-outline',
          label: 'Change Password',
          onPress: () => Alert.alert('Coming Soon', 'This feature is not yet available.'),
        },
        {
          kind: 'link',
          icon: 'shield-outline',
          label: 'Privacy Settings',
          onPress: () => Alert.alert('Coming Soon', 'This feature is not yet available.'),
        },
      ],
    },
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

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingBottom: 48,
    },

    // Sections
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: t.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    sectionCard: {
      backgroundColor: t.surfaceElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 15,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: t.surfaceElevated,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: t.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: t.textPrimary,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rowValue: {
      fontSize: 14,
      color: t.textTertiary,
    },

    // Toggle
    toggle: {
      width: 48,
      height: 28,
      borderRadius: 14,
      padding: 3,
      justifyContent: 'center',
    },
    toggleOn: {
      backgroundColor: palette.red600,
    },
    toggleOff: {
      backgroundColor: t.textDisabled,
    },
    toggleThumb: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: palette.white,
    },
    toggleThumbOn: {
      alignSelf: 'flex-end',
    },
    toggleThumbOff: {
      alignSelf: 'flex-start',
    },

    // Footer
    footer: {
      alignItems: 'center',
      marginTop: 8,
      gap: 4,
    },
    footerVersion: {
      fontSize: 13,
      color: t.textTertiary,
      fontWeight: '600',
    },
    footerBuild: {
      fontSize: 12,
      color: t.textDisabled,
    },
  });
