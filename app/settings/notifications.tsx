import React from 'react';
import { View, Text, Switch, StyleSheet, SafeAreaView, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNotificationSettings } from '@/features/notifications/useNotificationSettings';

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { preferences, isLoading, updatePreference } = useNotificationSettings(user?.id);
  const [permissionGranted, setPermissionGranted] = React.useState(true);

  React.useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermissionGranted(status === 'granted');
    });
  }, []);

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  if (isLoading || !preferences) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View testID="notification-settings-loading" style={styles.loading} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View testID="notification-settings" style={styles.container}>
        {!permissionGranted && (
          <View
            testID="permission-banner"
            style={[styles.banner, { backgroundColor: colors.warning }]}
          >
            <Text style={styles.bannerText}>
              Notifications are disabled. Enable them in your device settings.
            </Text>
            <Text testID="open-settings" style={styles.bannerLink} onPress={openSettings}>
              Open Settings
            </Text>
          </View>
        )}

        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Theatrical Releases</Text>
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
              Get notified when a watchlisted movie releases in theaters
            </Text>
          </View>
          <Switch
            testID="toggle-watchlist"
            value={preferences.notify_watchlist}
            onValueChange={(val) => updatePreference({ notify_watchlist: val })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>OTT Availability</Text>
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
              Get notified when a watchlisted movie appears on a streaming platform
            </Text>
          </View>
          <Switch
            testID="toggle-ott"
            value={preferences.notify_ott}
            onValueChange={(val) => updatePreference({ notify_ott: val })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Weekly Digest</Text>
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
              Receive a weekly summary of upcoming releases every Monday
            </Text>
          </View>
          <Switch
            testID="toggle-digest"
            value={preferences.notify_digest}
            onValueChange={(val) => updatePreference({ notify_digest: val })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
  },
  banner: {
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  bannerText: {
    fontSize: 14,
    color: '#333',
  },
  bannerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  rowSubtitle: {
    fontSize: 13,
  },
});
