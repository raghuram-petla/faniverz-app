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
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';
import { useGoogleAuth } from '@/features/auth/hooks/useGoogleAuth';
import { useAppleAuth } from '@/features/auth/hooks/useAppleAuth';
import { usePhoneAuth } from '@/features/auth/hooks/usePhoneAuth';
import { SocialSignInButtons } from '@/components/auth/SocialSignInButtons';
import { PhoneOtpModal } from '@/components/auth/PhoneOtpModal';
import { createRegisterStyles } from '@/styles/auth.styles';

// @coupling useEmailAuth, useGoogleAuth, useAppleAuth, usePhoneAuth — mirrors login.tsx auth strategies
// @boundary Account creation flow with client-side validation before Supabase call
export default function RegisterScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createRegisterStyles(theme), [theme]);
  const router = useRouter();
  // @sideeffect signUp creates Supabase user with username metadata
  const { signUp, isLoading, error } = useEmailAuth();
  const { signInWithGoogle, isLoading: googleLoading } = useGoogleAuth();
  const { signInWithApple, isLoading: appleLoading, isAvailable: appleAvailable } = useAppleAuth();
  // @coupling: usePhoneAuth uses Supabase signInWithOtp — shares auth session with email flow
  const { sendOtp, verifyOtp, isLoading: phoneLoading, error: phoneError } = usePhoneAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // @nullable validationError is null when no validation issue; cleared on each handleSignUp call
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // @contract All four fields required; password >= 6 chars; passwords must match
  // @sideeffect Clears validationError on each invocation before re-validating
  // @sideeffect On success, navigates to tabs via router.replace (replaces auth stack)
  const handleSignUp = async () => {
    setValidationError(null);
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setValidationError(t('auth.allFieldsRequired'));
      return;
    }
    if (password.length < 6) {
      setValidationError(t('auth.passwordMinLength'));
      return;
    }
    if (password !== confirmPassword) {
      setValidationError(t('auth.passwordsMismatch'));
      return;
    }
    try {
      // @sideeffect: signUp stores username in Supabase user_metadata, then a DB trigger copies it to profiles table
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

  // @edge Client-side validationError takes priority; falls back to server error from hook
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

        <Text style={styles.title}>{t('auth.createAccount')}</Text>
        <Text style={styles.subtitle}>{t('auth.joinCommunity')}</Text>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="at-outline"
            size={18}
            color={theme.textTertiary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth.username')}
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
            placeholder={t('auth.email')}
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
            placeholder={t('auth.password')}
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
            placeholder={t('auth.confirmPassword')}
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
            <Text style={styles.createButtonText}>{t('auth.createAccount')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* @nullable onApple is undefined on Android — SocialSignInButtons hides the button */}
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
          <Text style={styles.signInLabel}>{t('auth.alreadyHaveAccount')} </Text>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.signInLink}>{t('auth.signInLink')}</Text>
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
