import { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useGoogleAuth } from '@/features/auth/hooks/useGoogleAuth';
import { useAppleAuth } from '@/features/auth/hooks/useAppleAuth';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { SocialSignInButtons } from '@/components/auth/SocialSignInButtons';
import { createLoginStyles } from '@/styles/auth.styles';

// @coupling AuthProvider, useGoogleAuth, useAppleAuth — two OAuth strategies wired here
// @boundary Entry point for authentication: Google, Apple, and guest
export default function LoginScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createLoginStyles(theme), [theme]);
  const router = useRouter();
  const { signInWithGoogle, isLoading: googleLoading, error: googleError } = useGoogleAuth();
  // @edge appleAvailable is false on Android — Apple sign-in button conditionally hidden
  const {
    signInWithApple,
    isLoading: appleLoading,
    isAvailable: appleAvailable,
    error: appleError,
  } = useAppleAuth();
  // @coupling: setIsGuest writes to AuthProvider Zustand state — checked by useAuthGate throughout the app
  const { setIsGuest } = useAuth();

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

  const error = googleError || appleError;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
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

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* @nullable onApple is undefined when Apple auth unavailable (Android) */}
      <View style={styles.socialSection}>
        <SocialSignInButtons
          onGoogle={handleGoogleSignIn}
          onApple={appleAvailable ? handleAppleSignIn : undefined}
          isGoogleLoading={googleLoading}
          isAppleLoading={appleLoading}
          showApple={appleAvailable}
        />
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t('auth.or')}</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity style={styles.guestButton} onPress={handleGuest} activeOpacity={0.8}>
        <Text style={styles.guestButtonText}>{t('auth.continueAsGuest')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
