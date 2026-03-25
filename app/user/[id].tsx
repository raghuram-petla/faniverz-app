import { useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import { supabase } from '@/lib/supabase';
import { PLACEHOLDER_AVATAR } from '@/constants/placeholders';
import { getImageUrl } from '@shared/imageUrl';
import { createUserProfileStyles } from '@/styles/userProfile.styles';
import ScreenHeader from '@/components/common/ScreenHeader';
import type { UserProfile } from '@/types';

// @boundary: fetches public-facing profile fields only — no private data (email, phone) exposed
// @edge: returns null on any Supabase error (e.g., invalid UUID, deleted user)
async function fetchPublicProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url, bio, location, created_at')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as UserProfile;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createUserProfileStyles(theme), [theme]);

  // @contract: query is disabled when id is falsy — prevents fetching with empty string
  // @nullable: profile may be null even on success if the user doesn't exist
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => fetchPublicProfile(id ?? /* istanbul ignore next */ ''),
    enabled: !!id,
  });

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <ScreenHeader title={t('profile.title')} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.red600} />
        </View>
      ) : isError ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.gray500} />
          <Text style={styles.emptyText}>{t('common.somethingWentWrong')}</Text>
        </View>
      ) : !profile ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={48} color={colors.gray500} />
          <Text style={styles.emptyText}>{t('common.noResults')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Image
              source={{
                uri: getImageUrl(profile.avatar_url, 'sm', 'AVATARS') ?? PLACEHOLDER_AVATAR,
              }}
              style={styles.avatar}
              contentFit="cover"
            />
            <Text style={styles.displayName}>
              {profile.display_name ?? profile.username ?? t('feed.anonymous')}
            </Text>
            {profile.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
          </View>

          {/* Info */}
          {profile.bio ? (
            <View style={styles.infoSection}>
              <Text style={styles.bio} numberOfLines={4}>
                {profile.bio}
              </Text>
            </View>
          ) : null}

          {profile.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={colors.gray500} />
              <Text style={styles.locationText}>{profile.location}</Text>
            </View>
          ) : null}

          {profile.created_at ? (
            <View style={styles.locationRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.gray500} />
              <Text style={styles.locationText}>
                {t('profile.memberSince', {
                  date: new Date(profile.created_at).toLocaleDateString(),
                })}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
