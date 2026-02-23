import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useFavoriteActors, useFavoriteActorMutations } from '@/features/actors/hooks';
import { Actor, FavoriteActor } from '@/types';
import { colors } from '@/theme/colors';

const PLACEHOLDER_PHOTO = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300';
const COLUMN_GAP = 12;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - COLUMN_GAP) / 2;

// The API returns FavoriteActor with actor joined
interface FavoriteActorWithActor extends FavoriteActor {
  actor?: Actor;
}

export default function FavoriteActorsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: favorites, isLoading } = useFavoriteActors(user?.id ?? '');
  const { remove } = useFavoriteActorMutations();

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
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Favorite Actors</Text>
          {count > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{count}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.red600} />
        </View>
      ) : actorList.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="heart-outline" size={40} color={colors.red600} />
          </View>
          <Text style={styles.emptyTitle}>No favorite actors yet</Text>
          <Text style={styles.emptySubtitle}>
            Add actors you love to keep track of their upcoming movies.
          </Text>
          <TouchableOpacity style={styles.addActorsButton} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.addActorsText}>Add Actors</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((fav) => {
                const actor = fav.actor;
                const photoUrl = actor?.photo_url ?? PLACEHOLDER_PHOTO;
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
                        <Ionicons name="heart" size={12} color={colors.red500} />
                      </View>
                      {/* Remove button */}
                      <TouchableOpacity
                        style={styles.removeButton}
                        activeOpacity={0.8}
                        onPress={() => handleRemove(fav.actor_id)}
                      >
                        <Ionicons name="close" size={14} color={colors.white} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 48,
  },
  centered: {
    paddingVertical: 64,
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  countBadge: {
    backgroundColor: colors.red600,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.red600,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.red600_20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.white40,
    textAlign: 'center',
    lineHeight: 20,
  },
  addActorsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.red600,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  addActorsText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
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
    backgroundColor: colors.black80,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actorName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  heartBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.black80,
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
    backgroundColor: colors.black80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
