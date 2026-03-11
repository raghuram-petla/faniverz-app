import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, ActivityIndicator, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { useActorDetail } from '@/features/actors/hooks';
import { useEntityFollows, useFollowEntity, useUnfollowEntity } from '@/features/feed';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/formatDate';
import { createStyles } from '@/styles/actorDetail.styles';
import { ActorCollapsibleHeader } from '@/components/actor/ActorCollapsibleHeader';
import { ActorFilmography } from '@/components/actor/ActorFilmography';
import { ActorKnownFor } from '@/components/actor/ActorKnownFor';
import { FollowButton } from '@/components/feed/FollowButton';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import Animated from 'react-native-reanimated';

const GENDER_LABELS: Record<number, string> = { 1: 'Female', 2: 'Male', 3: 'Non-binary' };

export default function ActorDetailScreen() {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { actor, filmography, isLoading, refetch } = useActorDetail(id ?? '');
  const [showPhoto, setShowPhoto] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const scrollOffset = useSharedValue(0);
  const { followSet } = useEntityFollows();
  const followMutation = useFollowEntity();
  const unfollowMutation = useUnfollowEntity();
  const { gate } = useAuthGate();
  const { refreshing, onRefresh } = useRefresh(refetch);
  const { pullDistance, isRefreshing, handlePullScroll, handleScrollEndDrag } = usePullToRefresh(
    onRefresh,
    refreshing,
  );

  const isFollowing = followSet.has(`actor:${id}`);

  const handleFollowToggle = gate(() => {
    if (isFollowing) {
      unfollowMutation.mutate({ entityType: 'actor', entityId: id ?? '' });
    } else {
      followMutation.mutate({ entityType: 'actor', entityId: id ?? '' });
    }
  });

  const handleMoviePress = useCallback(
    (movieId: string) => router.push(`/movie/${movieId}`),
    [router],
  );

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12, paddingHorizontal: 16 }]}>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.red600} testID="loading-indicator" />
        </View>
      </View>
    );
  }

  if (!actor) return null;

  const genderLabel = actor.gender ? GENDER_LABELS[actor.gender] : null;
  const personTypeLabel =
    actor.person_type === 'technician'
      ? (filmography.find((c) => c.credit_type === 'crew')?.role_name ?? 'Technician')
      : 'Actor';
  const hasBioInfo = actor.birth_date || actor.place_of_birth || actor.height_cm;

  return (
    <Animated.ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: 0 }]}
      showsVerticalScrollIndicator={false}
      onScroll={(e) => {
        scrollOffset.value = e.nativeEvent.contentOffset.y;
        handlePullScroll(e);
      }}
      onScrollEndDrag={handleScrollEndDrag}
      scrollEventThrottle={16}
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        refreshing={refreshing}
      />

      <ActorCollapsibleHeader
        name={actor.name}
        photoUrl={actor.photo_url}
        scrollOffset={scrollOffset}
        insetTop={insets.top}
        onBack={() => router.back()}
        onPhotoPress={actor.photo_url ? () => setShowPhoto(true) : undefined}
        rightContent={
          <FollowButton
            isFollowing={isFollowing}
            onPress={handleFollowToggle}
            entityName={actor.name}
          />
        }
      />

      <View style={{ paddingHorizontal: 16 }}>
        <Text style={styles.actorName}>{actor.name}</Text>
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

        {hasBioInfo && (
          <View style={styles.bioCard}>
            {actor.birth_date && (
              <View style={styles.bioRow}>
                <Ionicons name="calendar-outline" size={16} color={theme.textTertiary} />
                <Text style={styles.bioLabel}>Born</Text>
                <Text style={styles.bioValue}>{formatDate(actor.birth_date)}</Text>
              </View>
            )}
            {actor.place_of_birth && (
              <View style={styles.bioRow}>
                <Ionicons name="location-outline" size={16} color={theme.textTertiary} />
                <Text style={styles.bioLabel}>From</Text>
                <Text style={styles.bioValue} numberOfLines={2}>
                  {actor.place_of_birth}
                </Text>
              </View>
            )}
            {actor.height_cm != null && (
              <View style={styles.bioRow}>
                <Ionicons name="resize-outline" size={16} color={theme.textTertiary} />
                <Text style={styles.bioLabel}>Height</Text>
                <Text style={styles.bioValue}>{actor.height_cm} cm</Text>
              </View>
            )}
          </View>
        )}

        {actor.biography ? (
          <View style={styles.aboutSection}>
            <Text style={styles.aboutTitle}>About</Text>
            <Text style={styles.aboutText} numberOfLines={bioExpanded ? undefined : 4}>
              {actor.biography}
            </Text>
            <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)} testID="bio-toggle">
              <Text style={styles.readMoreText}>{bioExpanded ? 'Show less' : 'Read more'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <ActorKnownFor credits={filmography} onMoviePress={handleMoviePress} />
        <ActorFilmography credits={filmography} onMoviePress={handleMoviePress} />
      </View>

      <Modal visible={showPhoto} animationType="fade" transparent testID="photo-modal">
        <Pressable
          style={styles.photoOverlay}
          onPress={() => setShowPhoto(false)}
          testID="photo-overlay"
        >
          <TouchableOpacity
            style={[styles.photoCloseButton, { top: insets.top + 12 }]}
            onPress={() => setShowPhoto(false)}
            accessibilityLabel="Close photo"
            testID="photo-close"
          >
            <Ionicons name="close" size={28} color={theme.textPrimary} />
          </TouchableOpacity>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Image
              source={{ uri: actor.photo_url ?? undefined }}
              style={styles.photoFull}
              contentFit="contain"
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Animated.ScrollView>
  );
}
