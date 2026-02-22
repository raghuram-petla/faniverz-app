import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useReviews, useMyReview, useDeleteReview } from '@/features/reviews/hooks';
import ReviewCard from '@/components/review/ReviewCard';
import ReviewSummary from '@/components/review/ReviewSummary';
import type { ReviewSortOption } from '@/types/review';
import type { ReviewWithProfile } from '@/features/reviews/api';

const SORT_OPTIONS: { label: string; value: ReviewSortOption }[] = [
  { label: 'Recent', value: 'recent' },
  { label: 'Highest', value: 'highest' },
  { label: 'Lowest', value: 'lowest' },
];

export default function ReviewsListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { movieId: movieIdParam } = useLocalSearchParams<{ movieId: string }>();
  const movieId = Number(movieIdParam);

  const [sort, setSort] = React.useState<ReviewSortOption>('recent');
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useReviews(movieId, sort);
  const { data: myReview } = useMyReview(movieId, user?.id);
  const deleteMutation = useDeleteReview();

  const allReviews = React.useMemo(() => {
    return data?.pages.flatMap((page) => page) ?? [];
  }, [data]);

  const averageRating = React.useMemo(() => {
    if (allReviews.length === 0) return 0;
    const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / allReviews.length) * 10) / 10;
  }, [allReviews]);

  const handleWriteReview = () => {
    router.push(`/review/write/${movieId}`);
  };

  const handleEdit = () => {
    router.push(`/review/write/${movieId}`);
  };

  const handleDelete = (reviewId: number) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete your review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate({ reviewId, movieId }),
      },
    ]);
  };

  const renderReview = ({ item }: { item: ReviewWithProfile }) => {
    const isOwn = item.user_id === user?.id;
    return (
      <ReviewCard
        review={item}
        isOwn={isOwn}
        onEdit={isOwn ? handleEdit : undefined}
        onDelete={isOwn ? () => handleDelete(item.id) : undefined}
      />
    );
  };

  const listData = React.useMemo(() => {
    if (!myReview) return allReviews;
    const filtered = allReviews.filter((r) => r.id !== myReview.id);
    return [myReview, ...filtered];
  }, [allReviews, myReview]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        testID="reviews-list"
        data={listData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderReview}
        ListHeaderComponent={
          <View>
            <ReviewSummary
              averageRating={averageRating}
              totalCount={allReviews.length}
              onWriteReview={handleWriteReview}
              onSeeAll={() => {}}
            />
            <View testID="sort-selector" style={styles.sortRow}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  testID={`sort-${option.value}`}
                  onPress={() => setSort(option.value)}
                  style={[
                    styles.sortButton,
                    {
                      backgroundColor: sort === option.value ? colors.primary : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sortText,
                      { color: sort === option.value ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View testID="empty-reviews" style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No reviews yet. Be the first to share your thoughts!
            </Text>
          </View>
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View testID="loading-more" style={styles.loadingMore}>
              <Text style={{ color: colors.textTertiary }}>Loading more...</Text>
            </View>
          ) : null
        }
      />
      <TouchableOpacity
        testID="write-review-fab"
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleWriteReview}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sortText: {
    fontSize: 13,
    fontWeight: '500',
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '400',
    marginTop: -2,
  },
});
