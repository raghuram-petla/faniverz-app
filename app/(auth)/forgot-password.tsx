import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import type { SemanticTheme } from '@shared/themes';
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';
import ScreenHeader from '@/components/common/ScreenHeader';

export default function ForgotPasswordScreen() {
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resetPassword, isLoading, error } = useEmailAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) return;
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch {
      // error is surfaced via `error` from the hook
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 12 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <ScreenHeader title="Reset Password" />

      <View style={styles.body}>
        {sent ? (
          /* Success state */
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="mail-outline" size={32} color={colors.red600} />
            </View>
            <Text style={styles.successTitle}>Check your inbox</Text>
            <Text style={styles.successSubtitle}>
              We sent a reset link to{'\n'}
              <Text style={styles.successEmail}>{email}</Text>
            </Text>
            <TouchableOpacity
              style={styles.backToSignIn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backToSignInText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Form state */
          <>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a link to reset your password.
            </Text>

            {/* Email input */}
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={theme.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
            </View>

            {/* Error message */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Send button */}
            <TouchableOpacity
              style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
              onPress={handleSend}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.textPrimary} />
              ) : (
                <Text style={styles.sendButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            {/* Back to Sign In */}
            <TouchableOpacity
              style={styles.backToSignIn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backToSignInText}>Back to Sign In</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
      paddingHorizontal: 16,
    },

    // Body
    body: {
      flex: 1,
    },
    subtitle: {
      fontSize: 15,
      color: t.textSecondary,
      lineHeight: 22,
      marginBottom: 28,
    },

    // Input
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 14,
      marginBottom: 12,
      height: 52,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: t.textPrimary,
    },

    // Error
    errorText: {
      fontSize: 13,
      color: '#EF4444',
      marginBottom: 12,
      paddingHorizontal: 4,
    },

    // Send button
    sendButton: {
      height: 52,
      backgroundColor: '#DC2626',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    sendButtonDisabled: {
      opacity: 0.6,
    },
    sendButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: t.textPrimary,
    },

    // Back link
    backToSignIn: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    backToSignInText: {
      fontSize: 14,
      color: t.textSecondary,
      fontWeight: '500',
    },

    // Success card
    successCard: {
      alignItems: 'center',
      paddingTop: 32,
      gap: 12,
    },
    successIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(220, 38, 38, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    successTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: t.textPrimary,
    },
    successSubtitle: {
      fontSize: 15,
      color: t.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    successEmail: {
      color: t.textPrimary,
      fontWeight: '600',
    },
  });
