import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';
import { useGoogleAuth } from '@/features/auth/hooks/useGoogleAuth';
import { useAppleAuth } from '@/features/auth/hooks/useAppleAuth';
import { usePhoneAuth } from '@/features/auth/hooks/usePhoneAuth';
import { SocialSignInButtons } from '@/components/auth/SocialSignInButtons';
import { PhoneOtpModal } from '@/components/auth/PhoneOtpModal';
import { createRegisterStyles } from '@/styles/auth.styles';

export default function RegisterScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createRegisterStyles(theme), [theme]);
  const router = useRouter();
  const { signUp, isLoading, error } = useEmailAuth();
  const { signInWithGoogle, isLoading: googleLoading } = useGoogleAuth();
  const { signInWithApple, isLoading: appleLoading, isAvailable: appleAvailable } = useAppleAuth();
  const { sendOtp, verifyOtp, isLoading: phoneLoading, error: phoneError } = usePhoneAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSignUp = async () => {
    setValidationError(null);
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setValidationError('All fields are required');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    try {
      await signUp(email.trim(), password, username.trim());
      router.replace('/(tabs)');
    } catch {
      // error is surfaced via the hook
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch {
      // error handled by hook
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      router.replace('/(tabs)');
    } catch {
      // error handled by hook
    }
  };

  const displayError = validationError || error;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the movie community</Text>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="at-outline"
            size={18}
            color={theme.textTertiary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={theme.textTertiary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="mail-outline"
            size={18}
            color={theme.textTertiary}
            style={styles.inputIcon}
          />
          <TextInput
            ref={emailRef}
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={theme.textTertiary}
            style={styles.inputIcon}
          />
          <TextInput
            ref={passwordRef}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.textTertiary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={theme.textTertiary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={theme.textTertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            returnKeyType="go"
            onSubmitEditing={handleSignUp}
          />
        </View>

        {displayError ? <Text style={styles.errorText}>{displayError}</Text> : null}

        <TouchableOpacity
          style={[styles.createButton, isLoading && styles.buttonDisabled]}
          onPress={handleSignUp}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.textPrimary} />
          ) : (
            <Text style={styles.createButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialSection}>
          <SocialSignInButtons
            onGoogle={handleGoogleSignIn}
            onApple={appleAvailable ? handleAppleSignIn : undefined}
            onPhone={() => setShowPhoneModal(true)}
            isGoogleLoading={googleLoading}
            isAppleLoading={appleLoading}
            showApple={appleAvailable}
          />
        </View>

        <View style={styles.signInRow}>
          <Text style={styles.signInLabel}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.signInLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PhoneOtpModal
        visible={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={() => router.replace('/(tabs)')}
        onSendOtp={sendOtp}
        onVerifyOtp={verifyOtp}
        isLoading={phoneLoading}
        error={phoneError}
      />
    </KeyboardAvoidingView>
  );
}
