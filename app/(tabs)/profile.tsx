import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useThemeStore, ThemeMode } from '@/stores/useThemeStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useUpdateProfile } from '@/features/auth/hooks/useUpdateProfile';
import { supabase } from '@/lib/supabase';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { mode, setMode } = useThemeStore();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const updateProfile = useUpdateProfile(user?.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const handleEditPress = () => {
    setEditName(profile?.display_name ?? '');
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfile.mutate({ display_name: editName });
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView testID="profile-screen" style={styles.container}>
        <Text style={[styles.header, { color: colors.text }]}>Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View testID="avatar" style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {(profile?.display_name ?? user?.email ?? '?')[0].toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Display Name */}
        {isEditing ? (
          <View style={styles.editRow}>
            <TextInput
              testID="edit-name-input"
              style={[styles.nameInput, { color: colors.text, borderColor: colors.border }]}
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />
            <TouchableOpacity testID="save-button" onPress={handleSave} style={styles.saveButton}>
              <Text style={{ color: colors.primary }}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nameRow}>
            <Text testID="display-name" style={[styles.name, { color: colors.text }]}>
              {profile?.display_name ?? 'User'}
            </Text>
            <TouchableOpacity testID="edit-button" onPress={handleEditPress}>
              <Text style={{ color: colors.primary }}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text testID="user-email" style={[styles.email, { color: colors.textSecondary }]}>
          {user?.email ?? ''}
        </Text>

        {/* Theme Toggle */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme</Text>
        <View testID="theme-toggle" style={[styles.themeToggle, { borderColor: colors.border }]}>
          {THEME_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              testID={`theme-${option.value}`}
              style={[
                styles.themeOption,
                mode === option.value && { backgroundColor: colors.primary },
              ]}
              onPress={() => setMode(option.value)}
            >
              <Text style={{ color: mode === option.value ? '#FFFFFF' : colors.text }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings Links */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
        <TouchableOpacity testID="notifications-link" style={styles.settingsRow}>
          <Text style={[styles.settingsText, { color: colors.text }]}>Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="language-link" style={styles.settingsRow}>
          <Text style={[styles.settingsText, { color: colors.text }]}>Language</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="about-link" style={styles.settingsRow}>
          <Text style={[styles.settingsText, { color: colors.text }]}>About</Text>
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity
          testID="sign-out-button"
          style={[styles.signOutButton, { borderColor: colors.error }]}
          onPress={handleSignOut}
        >
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingTop: 16,
    paddingBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 4,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
  },
  nameInput: {
    fontSize: 20,
    fontWeight: '600',
    borderBottomWidth: 1,
    paddingVertical: 4,
    minWidth: 150,
    textAlign: 'center',
  },
  saveButton: {
    padding: 4,
  },
  email: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  themeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  settingsRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  settingsText: {
    fontSize: 16,
  },
  signOutButton: {
    marginTop: 32,
    marginBottom: 48,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
