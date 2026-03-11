import { View, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';

export interface SocialSignInButtonsProps {
  onGoogle: () => void;
  onApple?: () => void;
  onPhone: () => void;
  isGoogleLoading?: boolean;
  isAppleLoading?: boolean;
  showApple?: boolean;
}

export function SocialSignInButtons({
  onGoogle,
  onApple,
  onPhone,
  isGoogleLoading = false,
  isAppleLoading = false,
  showApple = true,
}: SocialSignInButtonsProps) {
  const { theme } = useTheme();

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
            <Text style={[styles.buttonText, { color: theme.textPrimary }]}>Google</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Apple (iOS only) */}
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
              <Text style={[styles.buttonText, { color: theme.textPrimary }]}>Apple</Text>
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
        <Text style={[styles.buttonText, { color: theme.textPrimary }]}>Phone</Text>
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
