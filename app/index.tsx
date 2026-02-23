import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { colors } from '@/theme/colors';

const ONBOARDING_KEY = '@faniverz/onboarding_complete';

export default function Index() {
  const { session, isLoading, isGuest } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setOnboardingComplete(value === 'true');
    });
  }, []);

  if (isLoading || onboardingComplete === null) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.black,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.red600} />
      </View>
    );
  }

  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  if (!session && !isGuest) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
