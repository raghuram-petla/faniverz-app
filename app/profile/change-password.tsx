import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';
import { useTheme } from '@/theme';
import type { SemanticTheme } from '@shared/themes';
import ScreenHeader from '@/components/common/ScreenHeader';
import { colors as palette } from '@shared/colors';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { resetPassword, isLoading, error } = useEmailAuth();
  const [sent, setSent] = useState(false);

  const email = user?.email ?? '';

  const handleSend = async () => {
    if (!email) return;
    try {
      await resetPassword(email);
      setSent(true);
    } catch {
      // error is surfaced via `error` from the hook
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScreenHeader title={t('settings.changePassword')} />

      <View style={styles.body}>
        {sent ? (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="mail-outline" size={32} color={colors.red600} />
            </View>
            <Text style={styles.successTitle}>{t('auth.checkInbox')}</Text>
            <Text style={styles.successSubtitle}>
              {t('profile.resetLinkSentTo')}
              {'\n'}
              <Text style={styles.successEmail}>{email}</Text>
            </Text>
            <Text style={styles.successHint}>{t('profile.followResetLink')}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>{t('profile.resetLinkDescription')}</Text>

            <View style={styles.emailCard}>
              <Ionicons name="mail-outline" size={18} color={theme.textTertiary} />
              <Text style={styles.emailText}>{email}</Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
              onPress={handleSend}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={palette.white} />
              ) : (
                <Text style={styles.sendButtonText}>{t('profile.sendResetEmail')}</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background, paddingHorizontal: 16 },
    body: { flex: 1, paddingTop: 8 },
    subtitle: { fontSize: 15, color: t.textSecondary, lineHeight: 22, marginBottom: 24 },
    emailCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 14,
      paddingVertical: 16,
      marginBottom: 16,
      gap: 10,
    },
    emailText: { fontSize: 15, color: t.textPrimary },
    errorText: { fontSize: 13, color: palette.red500, marginBottom: 12, paddingHorizontal: 4 },
    sendButton: {
      height: 52,
      backgroundColor: palette.red600,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: { opacity: 0.6 },
    sendButtonText: { fontSize: 16, fontWeight: '700', color: palette.white },
    successCard: { alignItems: 'center', paddingTop: 32, gap: 12 },
    successIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: palette.red600_20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    successTitle: { fontSize: 22, fontWeight: '700', color: t.textPrimary },
    successSubtitle: { fontSize: 15, color: t.textSecondary, textAlign: 'center', lineHeight: 22 },
    successEmail: { color: t.textPrimary, fontWeight: '600' },
    successHint: { fontSize: 13, color: t.textTertiary, textAlign: 'center', marginTop: 4 },
  });
