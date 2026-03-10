import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActorAvatar } from '@/components/common/ActorAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { HomeButton } from '@/components/common/HomeButton';
import { useActorDetail } from '@/features/actors/hooks';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/formatDate';
import { createStyles } from '@/styles/actorDetail.styles';
import { getImageUrl } from '@shared/imageUrl';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const GENDER_LABELS: Record<number, string> = {
  1: 'Female',
  2: 'Male',
  3: 'Non-binary',
};

export default function ActorDetailScreen() {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { actor, filmography, isLoading, refetch } = useActorDetail(id ?? '');
  const [showPhoto, setShowPhoto] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const { pullDistance, isRefreshing, handlePullScroll, handleScrollEndDrag } = usePullToRefresh(
    onRefresh,
    refreshing,
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
      onScroll={handlePullScroll}
      onScrollEndDrag={handleScrollEndDrag}
      scrollEventThrottle={16}
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        refreshing={refreshing}
      />
      {/* Navigation buttons — absolute left, avatar centered */}
      <View style={styles.headerSection}>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <HomeButton />
        </View>

        <View style={styles.avatarCenter}>
          {actor.photo_url ? (
            <TouchableOpacity
              onPress={() => setShowPhoto(true)}
              activeOpacity={0.8}
              testID="avatar-tap"
            >
              <ActorAvatar actor={actor} size={120} />
            </TouchableOpacity>
          ) : (
            <ActorAvatar actor={actor} size={120} />
          )}
        </View>
      </View>

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

      {/* Bio info card */}
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

      {/* Biography / About */}
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

      {/* Filmography */}
      <View style={styles.filmographyHeader}>
        <Text style={styles.filmographyTitle}>Filmography</Text>
        {filmography.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filmography.length}</Text>
          </View>
        )}
      </View>

      {filmography.length === 0 ? (
        <EmptyState
          icon="film-outline"
          title="No movies found"
          subtitle="This person's filmography will appear here."
        />
      ) : (
        <View style={styles.filmographyList}>
          {filmography.map((credit) => {
            const movie = credit.movie;
            if (!movie) return null;
            const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
            const roleText =
              credit.credit_type === 'cast' && credit.role_name
                ? `as ${credit.role_name}`
                : credit.role_name;
            return (
              <TouchableOpacity
                key={credit.id}
                style={styles.filmCard}
                onPress={() => router.push(`/movie/${movie.id}`)}
                activeOpacity={0.7}
                testID={`film-card-${movie.id}`}
              >
                <Image
                  source={{ uri: getImageUrl(movie.poster_url, 'sm') ?? undefined }}
                  style={styles.filmPoster}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.filmInfo}>
                  <Text style={styles.filmTitle} numberOfLines={2}>
                    {movie.title}
                  </Text>
                  <Text style={styles.filmYear}>{year}</Text>
                  {roleText && (
                    <Text style={styles.filmRole} numberOfLines={1}>
                      {roleText}
                    </Text>
                  )}
                  {movie.rating > 0 && (
                    <View style={styles.filmRatingRow}>
                      <Ionicons name="star" size={12} color={colors.yellow400} />
                      <Text style={styles.filmRatingValue}>{movie.rating}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Full-screen photo modal */}
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
    </ScrollView>
  );
}
