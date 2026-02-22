import React from 'react';
import { ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyReview, useCreateReview, useUpdateReview } from '@/features/reviews/hooks';
import ReviewForm from '@/components/review/ReviewForm';
import type { ReviewInsert, ReviewUpdate } from '@/types/review';

export default function WriteReviewScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { movieId: movieIdParam } = useLocalSearchParams<{ movieId: string }>();
  const movieId = Number(movieIdParam);

  const { data: existingReview } = useMyReview(movieId, user?.id);
  const createMutation = useCreateReview();
  const updateMutation = useUpdateReview();

  const isEdit = !!existingReview;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (data: ReviewInsert | ReviewUpdate) => {
    if (isEdit && existingReview) {
      updateMutation.mutate(
        { reviewId: existingReview.id, movieId, updates: data as ReviewUpdate },
        { onSuccess: () => router.back() }
      );
    } else {
      createMutation.mutate(
        { userId: user!.id, review: data as ReviewInsert },
        { onSuccess: () => router.back() }
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView testID="write-review-screen" style={styles.container}>
        <ReviewForm
          existingReview={existingReview}
          onSubmit={handleSubmit}
          isPending={isPending}
          movieId={movieId}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
