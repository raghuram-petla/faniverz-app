import { useState } from 'react';
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
import { colors } from '@/theme/colors';
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';
import ScreenHeader from '@/components/common/ScreenHeader';

export default function ForgotPasswordScreen() {
  const router = useRouter();
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
      style={styles.container}
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
                color={colors.white40}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.white40}
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
                <ActivityIndicator size="small" color={colors.white} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    paddingHorizontal: 16,
    paddingTop: 56,
  },

  // Body
  body: {
    flex: 1,
  },
  subtitle: {
    fontSize: 15,
    color: colors.white60,
    lineHeight: 22,
    marginBottom: 28,
  },

  // Input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.white10,
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
    color: colors.white,
  },

  // Error
  errorText: {
    fontSize: 13,
    color: colors.red500,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Send button
  sendButton: {
    height: 52,
    backgroundColor: colors.red600,
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
    color: colors.white,
  },

  // Back link
  backToSignIn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backToSignInText: {
    fontSize: 14,
    color: colors.white60,
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
    backgroundColor: colors.red600_20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.white60,
    textAlign: 'center',
    lineHeight: 22,
  },
  successEmail: {
    color: colors.white,
    fontWeight: '600',
  },
});
