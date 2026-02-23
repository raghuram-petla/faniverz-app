import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

type IconName = keyof typeof Ionicons.glyphMap;

// ── Toggle Component ────────────────────────────────────────────────────────
function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}
    >
      <View style={[styles.toggleThumb, value ? styles.toggleThumbOn : styles.toggleThumbOff]} />
    </TouchableOpacity>
  );
}

// ── Row types ───────────────────────────────────────────────────────────────
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
  const router = useRouter();

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
        { kind: 'link', icon: 'lock-closed-outline', label: 'Change Password' },
        { kind: 'link', icon: 'shield-outline', label: 'Privacy Settings' },
      ],
    },
    {
      title: 'Preferences',
      rows: [{ kind: 'link', icon: 'language-outline', label: 'Language', value: 'English' }],
    },
    {
      title: 'About',
      rows: [
        { kind: 'link', icon: 'help-circle-outline', label: 'Help & Support' },
        { kind: 'link', icon: 'document-text-outline', label: 'Terms of Service' },
        { kind: 'link', icon: 'eye-outline', label: 'Privacy Policy' },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerPlaceholder} />
      </View>

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
                        <Ionicons name={row.icon} size={18} color={colors.white60} />
                      </View>
                      <Text style={styles.rowLabel}>{row.label}</Text>
                    </View>
                    <Toggle value={toggle.value} onToggle={toggle.setter} />
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
                      <Ionicons name={row.icon} size={18} color={colors.white60} />
                    </View>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
                    <Ionicons name="chevron-forward" size={16} color={colors.white30} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 48,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  headerPlaceholder: {
    width: 40,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white40,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: colors.white5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white10,
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
    borderBottomColor: colors.white5,
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
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.white,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 14,
    color: colors.white40,
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
    backgroundColor: colors.red600,
  },
  toggleOff: {
    backgroundColor: colors.white20,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
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
    color: colors.white40,
    fontWeight: '600',
  },
  footerBuild: {
    fontSize: 12,
    color: colors.white20,
  },
});
