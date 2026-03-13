import { useState, useMemo } from 'react';
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
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';
import { useGoogleAuth } from '@/features/auth/hooks/useGoogleAuth';
import { useAppleAuth } from '@/features/auth/hooks/useAppleAuth';
import { usePhoneAuth } from '@/features/auth/hooks/usePhoneAuth';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { SocialSignInButtons } from '@/components/auth/SocialSignInButtons';
import { PhoneOtpModal } from '@/components/auth/PhoneOtpModal';
import { createLoginStyles } from '@/styles/auth.styles';

// @coupling AuthProvider, useEmailAuth, useGoogleAuth, useAppleAuth, usePhoneAuth — four auth strategies wired here
// @boundary Entry point for all authentication flows: email, Google, Apple, phone OTP, and guest
export default function LoginScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createLoginStyles(theme), [theme]);
  const router = useRouter();
  // @sideeffect signIn triggers Supabase email auth, sets session in AuthProvider
  const { signIn, isLoading, error } = useEmailAuth();
  const { signInWithGoogle, isLoading: googleLoading } = useGoogleAuth();
  // @edge appleAvailable is false on Android — Apple sign-in button conditionally hidden
  const { signInWithApple, isLoading: appleLoading, isAvailable: appleAvailable } = useAppleAuth();
  const { sendOtp, verifyOtp, isLoading: phoneLoading, error: phoneError } = usePhoneAuth();
  // @coupling: setIsGuest writes to AuthProvider Zustand state — checked by useAuthGate throughout the app
  const { setIsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // @contract Requires non-empty email and password; silently no-ops on empty fields
  // @sideeffect On success, navigates to tabs via router.replace (replaces auth stack)
  const handleSignIn = async () => {
    if (!email.trim() || !password) return;
    try {
      await signIn(email.trim(), password);
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

  // @sideeffect Sets guest flag in AuthProvider — limits access to gated features downstream
  const handleGuest = () => {
    setIsGuest(true);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* @assumes keyboardShouldPersistTaps="handled" prevents keyboard dismiss on button tap */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.closeRow}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            accessibilityLabel="Close"
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo-full.png')}
            style={styles.logoFull}
            contentFit="contain"
            accessibilityLabel="Faniverz"
          />
          <Text style={styles.tagline}>{t('profile.tagline')}</Text>
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="mail-outline"
            size={18}
            color={theme.textTertiary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            placeholderTextColor={theme.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
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
            style={styles.input}
            placeholder={t('auth.password')}
            placeholderTextColor={theme.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            returnKeyType="go"
            onSubmitEditing={handleSignIn}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.signInButton, isLoading && styles.buttonDisabled]}
          onPress={handleSignIn}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.textPrimary} />
          ) : (
            <Text style={styles.signInButtonText}>{t('auth.signIn')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() => router.push('/(auth)/forgot-password')}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* @nullable onApple is undefined when Apple auth unavailable (Android) */}
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

        <TouchableOpacity style={styles.guestButton} onPress={handleGuest} activeOpacity={0.8}>
          <Text style={styles.guestButtonText}>{t('auth.continueAsGuest')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* @sync PhoneOtpModal manages its own OTP send/verify lifecycle; onSuccess triggers navigation */}
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
