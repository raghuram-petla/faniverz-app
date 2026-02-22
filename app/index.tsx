import { Redirect } from 'expo-router';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function Index() {
  const { session, isLoading } = useAuth();

  if (isLoading) return null;

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
