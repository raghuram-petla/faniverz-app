import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// @sideeffect: enables LayoutAnimation on Android — must be called at module scope before any animation
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useActorDetail } from '@/features/actors/hooks';
import { useEntityFollows, useFollowEntity, useUnfollowEntity } from '@/features/feed';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/formatDate';
import { createStyles } from '@/styles/actorDetail.styles';
import { CollapsibleProfileLayout } from '@/components/common/CollapsibleProfileLayout';
import { ActorAvatar } from '@/components/common/ActorAvatar';
import { ActorFilmography } from '@/components/actor/ActorFilmography';
import { ActorKnownFor } from '@/components/actor/ActorKnownFor';
import { FollowButton } from '@/components/feed/FollowButton';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';
import { ActorDetailSkeleton } from '@/components/actor/ActorDetailSkeleton';
import ScreenHeader from '@/components/common/ScreenHeader';
import { ActorPhotoModal } from '@/components/actor/ActorPhotoModal';

// @coupling: gender codes match the TMDB gender enum values stored in the actors table
const GENDER_LABEL_KEYS: Record<number, string> = {
  1: 'actorDetail.female',
  2: 'actorDetail.male',
  3: 'actorDetail.nonBinary',
};

export default function ActorDetailScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  // @assumes: id is a UUID string from the actors table; undefined if deep-linked with invalid param
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  // @boundary: useActorDetail fetches actor + filmography (credits) via Supabase RPC or joined select
  // @coupling: filmography items are used by both ActorKnownFor and ActorFilmography components below
  const { actor, filmography, isLoading, refetch } = useActorDetail(
    id ?? /* istanbul ignore next */ '',
  );
  const [showPhoto, setShowPhoto] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const { followSet } = useEntityFollows();
  const followMutation = useFollowEntity();
  const unfollowMutation = useUnfollowEntity();
  const { gate } = useAuthGate();
  const { refreshing, onRefresh } = useRefresh(refetch);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
    androidPullProps,
  } = usePullToRefresh(onRefresh, refreshing);

  // @coupling: followSet key format = "entityType:entityId"
  const isFollowing = followSet.has(`actor:${id}`);
  // @contract: gate() = auth check; mutations are idempotent (upsert + delete)
  const handleFollowToggle = gate(() => {
    if (isFollowing) {
      unfollowMutation.mutate({
        entityType: 'actor',
        entityId: id ?? /* istanbul ignore next */ '',
      });
    } else {
      followMutation.mutate({ entityType: 'actor', entityId: id ?? /* istanbul ignore next */ '' });
    }
  });

  const animationsEnabled = useAnimationsEnabled();
  const toggleBio = useCallback(() => {
    if (animationsEnabled) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setBioExpanded((prev) => !prev);
  }, [animationsEnabled]);

  const handleMoviePress = useCallback(
    (movieId: string) => router.push(`/movie/${movieId}`),
    [router],
  );

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <ActorDetailSkeleton />
      </View>
    );
  }

  if (!actor) {
    return (
      <View style={styles.screen}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
          <ScreenHeader title="" />
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.textTertiary} />
            <Text style={{ color: theme.textTertiary, marginTop: 8, fontSize: 16 }}>
              {t('common.noResults')}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // @nullable: actor.gender is 0 (unknown) when TMDB doesn't have the data — no label shown
  const genderLabel = actor.gender ? t(GENDER_LABEL_KEYS[actor.gender]) : null;
  // @edge: technicians show their first crew role name; falls back to generic "Technician" label
  const personTypeLabel =
    actor.person_type === 'technician'
      ? (filmography.find((c) => c.credit_type === 'crew')?.role_name ??
        t('actorDetail.technician'))
      : t('actorDetail.actor');
  const hasBioInfo =
    actor.birth_date || actor.place_of_birth || actor.height_cm || actor.death_date;
  /** @nullable social link IDs come from TMDB external_ids endpoint; null when not available */
  const hasSocialLinks = actor.imdb_id || actor.instagram_id || actor.twitter_id;
  const alsoKnownAs = (actor.also_known_as ?? []).filter(Boolean);

  return (
    <>
      <CollapsibleProfileLayout
        name={actor.name}
        renderImage={(size) => <ActorAvatar actor={{ ...actor } as never} size={size} />}
        onBack={() => router.back()}
        onImagePress={actor.photo_url ? () => setShowPhoto(true) : undefined}
        rightContent={
          <FollowButton
            isFollowing={isFollowing}
            onPress={handleFollowToggle}
            entityName={actor.name}
          />
        }
        heroContent={
          <>
            <View style={styles.badgeRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{personTypeLabel}</Text>
              </View>
              {genderLabel && (
                <View style={styles.genderBadge}>
                  <Text style={styles.genderBadgeText}>{genderLabel}</Text>
                </View>
              )}
            </View>
            {alsoKnownAs.length > 0 && (
              <View style={styles.alsoKnownAsRow}>
                {alsoKnownAs.map((name, idx) => (
                  <View key={`${name}-${idx}`} style={styles.alsoKnownAsChip}>
                    <Text style={styles.alsoKnownAsText}>{name}</Text>
                  </View>
                ))}
              </View>
            )}
            {hasSocialLinks && (
              <View style={styles.socialLinksRow}>
                {actor.imdb_id && (
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => Linking.openURL(`https://www.imdb.com/name/${actor.imdb_id}`)}
                    accessibilityLabel="IMDb profile"
                    testID="social-imdb"
                  >
                    <Text style={styles.socialButtonText}>IMDb</Text>
                  </TouchableOpacity>
                )}
                {actor.instagram_id && (
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() =>
                      Linking.openURL(`https://www.instagram.com/${actor.instagram_id}`)
                    }
                    accessibilityLabel="Instagram profile"
                    testID="social-instagram"
                  >
                    <Ionicons name="logo-instagram" size={18} color={theme.textPrimary} />
                  </TouchableOpacity>
                )}
                {actor.twitter_id && (
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => Linking.openURL(`https://twitter.com/${actor.twitter_id}`)}
                    accessibilityLabel="Twitter profile"
                    testID="social-twitter"
                  >
                    <Ionicons name="logo-twitter" size={18} color={theme.textPrimary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        }
        onScroll={handlePullScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        androidPullProps={androidPullProps}
        scrollHeader={
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            isRefreshing={isRefreshing}
            refreshing={refreshing}
          />
        }
      >
        <View style={{ paddingHorizontal: 16 }}>
          {hasBioInfo && (
            <View style={styles.bioCard}>
              {actor.birth_date && (
                <View style={styles.bioRow}>
                  <Ionicons name="calendar-outline" size={16} color={theme.textTertiary} />
                  <Text style={styles.bioLabel}>{t('actorDetail.born')}</Text>
                  <Text style={styles.bioValue}>{formatDate(actor.birth_date)}</Text>
                </View>
              )}
              {actor.death_date && (
                <View style={styles.bioRow}>
                  <Ionicons name="heart-dislike-outline" size={16} color={theme.textTertiary} />
                  <Text style={styles.bioLabel}>{t('actorDetail.died')}</Text>
                  <Text style={styles.bioValue}>{formatDate(actor.death_date)}</Text>
                </View>
              )}
              {actor.place_of_birth && (
                <View style={styles.bioRow}>
                  <Ionicons name="location-outline" size={16} color={theme.textTertiary} />
                  <Text style={styles.bioLabel}>{t('actorDetail.from')}</Text>
                  <Text style={styles.bioValue} numberOfLines={2}>
                    {actor.place_of_birth}
                  </Text>
                </View>
              )}
              {actor.height_cm != null && (
                <View style={styles.bioRow}>
                  <Ionicons name="resize-outline" size={16} color={theme.textTertiary} />
                  <Text style={styles.bioLabel}>{t('actorDetail.height')}</Text>
                  <Text style={styles.bioValue}>{actor.height_cm} cm</Text>
                </View>
              )}
            </View>
          )}

          {actor.biography ? (
            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>{t('actorDetail.about')}</Text>
              <Text style={styles.aboutText} numberOfLines={bioExpanded ? undefined : 4}>
                {actor.biography}
              </Text>
              <TouchableOpacity onPress={toggleBio} testID="bio-toggle">
                <Text style={styles.readMoreText}>
                  {bioExpanded ? t('actorDetail.showLess') : t('actorDetail.readMore')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <ActorKnownFor credits={filmography} onMoviePress={handleMoviePress} />
          <ActorFilmography credits={filmography} onMoviePress={handleMoviePress} />
        </View>
      </CollapsibleProfileLayout>

      <ActorPhotoModal
        visible={showPhoto}
        photoUrl={actor.photo_url}
        onClose={() => setShowPhoto(false)}
        topInset={insets.top}
        textPrimaryColor={theme.textPrimary}
        styles={styles}
      />
    </>
  );
}
