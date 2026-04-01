import { View, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from 'react-i18next';

/**
 * @contract Google and Apple auth buttons rendered as full-width stacked buttons.
 * @assumes showApple should be false on Android — caller must check Platform.OS before passing.
 */
export interface SocialSignInButtonsProps {
  onGoogle: () => void;
  onApple?: () => void;
  isGoogleLoading?: boolean;
  isAppleLoading?: boolean;
  showApple?: boolean;
}

/** @coupling parent must supply async handlers that trigger OAuth flows */
export function SocialSignInButtons({
  onGoogle,
  onApple,
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
            <Image source={require('../../../assets/google-logo.svg')} style={styles.googleIcon} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
