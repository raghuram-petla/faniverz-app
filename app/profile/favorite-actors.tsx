import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import ScreenHeader from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useFavoriteActors, useFavoriteActorMutations } from '@/features/actors/hooks';
import { Actor, FavoriteActor } from '@/types';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';
import { ProfileGridSkeleton } from '@/components/profile/ProfileGridSkeleton';
import { PLACEHOLDER_PHOTO } from '@/constants/placeholders';
import { getImageUrl } from '@shared/imageUrl';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const COLUMN_GAP = 12;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - COLUMN_GAP) / 2;

// @boundary: the API returns FavoriteActor with actor joined via Supabase select
// @nullable: actor may be undefined if the join fails (e.g., deleted actor row)
interface FavoriteActorWithActor extends FavoriteActor {
  actor?: Actor;
}

// @boundary: Favorite actors grid — 2-column layout with add/remove capabilities
// @coupling: useFavoriteActors, useFavoriteActorMutations — backed by favorite_actors table
export default function FavoriteActorsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: favorites, isLoading, refetch } = useFavoriteActors(user?.id ?? '');
  const { remove } = useFavoriteActorMutations();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);

  const actorList = (favorites ?? []) as FavoriteActorWithActor[];
  const count = actorList.length;

  // @edge: no-op when user is not authenticated
  // @sideeffect: removes the favorite record from DB; query cache invalidated on success
  const handleRemove = (actorId: string) => {
    if (!user?.id) return;
    remove.mutate({ userId: user.id, actorId });
  };

  // Build rows of two for the grid
  const rows: FavoriteActorWithActor[][] = [];
  for (let i = 0; i < actorList.length; i += 2) {
    rows.push(actorList.slice(i, i + 2));
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
      onScroll={handlePullScroll}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      scrollEventThrottle={16}
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        refreshing={refreshing}
      />
      {/* Header */}
      <ScreenHeader
        title={t('profile.favoriteActors')}
        titleBadge={
          count > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{count}</Text>
            </View>
          )
        }
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="add" size={20} color={palette.white} />
          </TouchableOpacity>
        }
      />

      {/* Content */}
      {isLoading ? (
        <ProfileGridSkeleton testID="favorite-actors-skeleton" />
      ) : actorList.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title={t('profile.noFavoriteActors')}
          subtitle={t('profile.noFavoriteActorsSubtitle')}
          actionLabel={t('profile.addActors')}
          onAction={() => router.push('/search')}
        />
      ) : (
        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((fav) => {
                const actor = fav.actor;
                const photoUrl =
                  getImageUrl(actor?.photo_url ?? null, 'sm', 'ACTORS') ?? PLACEHOLDER_PHOTO;
                const name = actor?.name ?? 'Unknown';
                return (
                  <TouchableOpacity
                    key={fav.actor_id}
                    style={styles.actorCard}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/actor/${fav.actor_id}`)}
                    accessibilityLabel={name}
                  >
                    {/* Poster */}
                    <View style={styles.posterWrapper}>
                      <Image
                        source={{ uri: photoUrl }}
                        style={styles.actorPhoto}
                        contentFit="cover"
                        transition={200}
                      />
                      {/* Gradient overlay for name */}
                      <View style={styles.nameOverlay}>
                        <Text style={styles.actorName} numberOfLines={2}>
                          {name}
                        </Text>
                      </View>
                      {/* Heart badge */}
                      <View style={styles.heartBadge}>
                        <Ionicons name="heart" size={12} color={palette.red500} />
                      </View>
                      {/* Remove button */}
                      <TouchableOpacity
                        style={styles.removeButton}
                        activeOpacity={0.8}
                        onPress={() => handleRemove(fav.actor_id)}
                      >
                        <Ionicons name="close" size={14} color={palette.white} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {/* If odd number, pad with empty slot */}
              {row.length === 1 && <View style={[styles.actorCard, styles.actorCardEmpty]} />}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingBottom: 48,
    },
    centered: {
      paddingVertical: 64,
      alignItems: 'center',
    },

    // Header badge & action
    countBadge: {
      backgroundColor: palette.red600,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      minWidth: 24,
      alignItems: 'center',
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.white,
    },
    addButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: palette.red600,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Grid
    grid: {
      gap: COLUMN_GAP,
    },
    gridRow: {
      flexDirection: 'row',
      gap: COLUMN_GAP,
    },
    actorCard: {
      width: CARD_WIDTH,
    },
    actorCardEmpty: {
      // invisible spacer to keep grid alignment
    },

    // Poster
    posterWrapper: {
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      aspectRatio: 3 / 4,
    },
    actorPhoto: {
      width: '100%',
      height: '100%',
    },
    nameOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: t.overlayHeavy,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    actorName: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.white,
    },
    heartBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: t.overlayHeavy,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: t.overlayHeavy,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
