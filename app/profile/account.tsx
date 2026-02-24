import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';
import { colors } from '@/theme/colors';
import ScreenHeader from '@/components/common/ScreenHeader';

type IconName = keyof typeof Ionicons.glyphMap;

interface AccountRow {
  icon: IconName;
  label: string;
  onPress: () => void;
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { signOut } = useEmailAuth();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
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

  const handleDeleteAccount = () => {
    Alert.alert('Coming Soon', 'This feature is not yet available.');
  };

  const rows: AccountRow[] = [
    { icon: 'log-out-outline', label: 'Log Out', onPress: handleLogout },
    { icon: 'trash-outline', label: 'Delete Account', onPress: handleDeleteAccount },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title="Account Details" />

      {/* Account info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
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
                <Ionicons name={row.icon} size={18} color={colors.red500} />
              </View>
              <Text style={styles.dangerLabel}>{row.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
    paddingBottom: 48,
  },

  // Info card
  infoCard: {
    backgroundColor: colors.white5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white10,
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
    color: colors.white40,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.white,
  },

  // Danger card
  dangerCard: {
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
  },
  dangerIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.red600_20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.red500,
  },
});
