import { View, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from 'react-i18next';
import { colors as palette } from '@/theme/colors';

export interface SocialSignInButtonsProps {
  onGoogle: () => void;
  onApple?: () => void;
  onPhone: () => void;
  isGoogleLoading?: boolean;
  isAppleLoading?: boolean;
  showApple?: boolean;
}

/** @coupling parent must supply async handlers that trigger OAuth/OTP flows */
export function SocialSignInButtons({
  onGoogle,
  onApple,
  onPhone,
  isGoogleLoading = false,
  isAppleLoading = false,
  showApple = true,
}: SocialSignInButtonsProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Google */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.input }]}
        onPress={onGoogle}
        disabled={isGoogleLoading}
        activeOpacity={0.7}
        accessibilityLabel="Sign in with Google"
      >
        {isGoogleLoading ? (
          <ActivityIndicator size="small" color={theme.textPrimary} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color={palette.red500} />
            <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
              {t('auth.google')}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* @contract Apple button only renders when showApple=true AND onApple handler is provided (iOS only) */}
      {showApple && onApple ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.input }]}
          onPress={onApple}
          disabled={isAppleLoading}
          activeOpacity={0.7}
          accessibilityLabel="Sign in with Apple"
        >
          {isAppleLoading ? (
            <ActivityIndicator size="small" color={theme.textPrimary} />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color={theme.textPrimary} />
              <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
                {t('auth.apple')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      {/* Phone */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.input }]}
        onPress={onPhone}
        activeOpacity={0.7}
        accessibilityLabel="Sign in with Phone"
      >
        <Ionicons name="call-outline" size={20} color={palette.green500} />
        <Text style={[styles.buttonText, { color: theme.textPrimary }]}>{t('auth.phone')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
