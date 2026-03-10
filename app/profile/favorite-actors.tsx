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
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';
import { LoadingCenter } from '@/components/common/LoadingCenter';
import { PLACEHOLDER_PHOTO } from '@/constants/placeholders';
import { getImageUrl } from '@shared/imageUrl';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const COLUMN_GAP = 12;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - COLUMN_GAP) / 2;

// The API returns FavoriteActor with actor joined
interface FavoriteActorWithActor extends FavoriteActor {
  actor?: Actor;
}

export default function FavoriteActorsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: favorites, isLoading, refetch } = useFavoriteActors(user?.id ?? '');
  const { remove } = useFavoriteActorMutations();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const { pullDistance, isRefreshing, handlePullScroll, handleScrollEndDrag } = usePullToRefresh(
    onRefresh,
    refreshing,
  );

  const actorList = (favorites ?? []) as FavoriteActorWithActor[];
  const count = actorList.length;

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
        title="Favorite Actors"
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
        <LoadingCenter style={styles.centered} />
      ) : actorList.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No favorite actors yet"
          subtitle="Add actors you love to keep track of their upcoming movies."
          actionLabel="Add Actors"
          onAction={() => router.push('/search')}
        />
      ) : (
        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((fav) => {
                const actor = fav.actor;
                const photoUrl = getImageUrl(actor?.photo_url ?? null, 'sm') ?? PLACEHOLDER_PHOTO;
                const name = actor?.name ?? 'Unknown';
                return (
                  <View key={fav.actor_id} style={styles.actorCard}>
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
                  </View>
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
