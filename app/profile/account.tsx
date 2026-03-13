import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';
import { useDeleteAccount } from '@/features/auth/hooks/useDeleteAccount';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';
import ScreenHeader from '@/components/common/ScreenHeader';

type IconName = keyof typeof Ionicons.glyphMap;

interface AccountRow {
  icon: IconName;
  label: string;
  onPress: () => void;
}

// @boundary: Account management — logout and delete account (both destructive actions)
// @coupling: useEmailAuth (signOut), useDeleteAccount — both interact with Supabase auth
export default function AccountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { signOut } = useEmailAuth();
  const deleteAccount = useDeleteAccount();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // @sideeffect: presents confirmation dialog, then signs out and navigates to profile tab
  const handleLogout = () => {
    Alert.alert(t('profile.logOut'), t('profile.logOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logOut'),
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(tabs)/profile');
          } catch {
            // error handled inside useEmailAuth
          }
        },
      },
    ]);
  };

  // @sideeffect: irreversible — deletes the user's account and all associated data from Supabase
  // @edge: on success, navigates to profile tab where the user will see the logged-out state
  const handleDeleteAccount = () => {
    Alert.alert(t('profile.deleteAccount'), t('profile.deleteAccountConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteAccount.mutate(undefined, {
            onSuccess: () => router.replace('/(tabs)/profile'),
            onError: (err) =>
              Alert.alert(
                t('common.error'),
                err instanceof Error ? err.message : t('profile.deleteFailed'),
              ),
          });
        },
      },
    ]);
  };

  const rows: AccountRow[] = [
    { icon: 'log-out-outline', label: t('profile.logOut'), onPress: handleLogout },
    { icon: 'trash-outline', label: t('profile.deleteAccount'), onPress: handleDeleteAccount },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title={t('profile.accountDetails')} />

      {/* Account info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('profile.email')}</Text>
          <Text style={styles.infoValue}>{user?.email ?? ''}</Text>
        </View>
      </View>

      {/* Danger actions */}
      <View style={styles.dangerCard}>
        {rows.map((row, index) => (
          <TouchableOpacity
            key={row.label}
            style={[styles.row, index < rows.length - 1 && styles.rowBorder]}
            activeOpacity={0.7}
            onPress={row.onPress}
          >
            <View style={styles.rowLeft}>
              <View style={styles.dangerIconWrapper}>
                <Ionicons name={row.icon} size={18} color={palette.red500} />
              </View>
              <Text style={styles.dangerLabel}>{row.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
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

    // Info card
    infoCard: {
      backgroundColor: t.surfaceElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      overflow: 'hidden',
      marginBottom: 24,
    },
    infoRow: {
      paddingHorizontal: 16,
      paddingVertical: 15,
    },
    infoLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: t.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 15,
      fontWeight: '500',
      color: t.textPrimary,
    },

    // Danger card
    dangerCard: {
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
    },
    dangerIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: palette.red600_20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: palette.red500,
    },
  });
