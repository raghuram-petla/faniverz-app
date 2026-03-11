import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useFeedItem, useComments, useAddComment, useDeleteComment } from '@/features/feed';
import { FeedCard } from '@/components/feed/FeedCard';
import { CommentsList } from '@/components/feed/CommentsList';
import { CommentInput } from '@/components/feed/CommentInput';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { createPostDetailStyles } from '@/styles/postDetail.styles';
import type { NewsFeedItem, FeedEntityType } from '@shared/types';

export default function PostDetailScreen() {
  const { theme, colors } = useTheme();
  const styles = createPostDetailStyles(theme);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data: post, isLoading: feedLoading } = useFeedItem(id ?? '');

  const {
    data: commentsData,
    isLoading: commentsLoading,
    hasNextPage,
    fetchNextPage,
  } = useComments(id ?? '');
  const addMutation = useAddComment(id ?? '');
  const deleteMutation = useDeleteComment(id ?? '');

  const comments = useMemo(() => commentsData?.pages.flatMap((p) => p) ?? [], [commentsData]);

  const handleNoOp = (_item: NewsFeedItem) => {};

  const handleEntityPress = (entityType: FeedEntityType, entityId: string) => {
    const routes: Record<FeedEntityType, string> = {
      movie: `/movie/${entityId}`,
      actor: `/actor/${entityId}`,
      production_house: `/production-house/${entityId}`,
    };
    router.push(routes[entityType] as Parameters<typeof router.push>[0]);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaCover />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {feedLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.red600} />
          </View>
        ) : post ? (
          <>
            <FeedCard item={post} onPress={handleNoOp} onEntityPress={handleEntityPress} />

            {/* Comments */}
            <View style={styles.commentsList}>
              <Text style={styles.commentsHeader}>Comments ({post.comment_count})</Text>
              <CommentsList
                comments={comments}
                userId={userId}
                isLoading={commentsLoading}
                hasNextPage={hasNextPage}
                onLoadMore={fetchNextPage}
                onDelete={(commentId) => deleteMutation.mutate(commentId)}
              />
            </View>
          </>
        ) : (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.gray500} />
            <Text style={{ color: colors.gray500, marginTop: 8 }}>Post not found</Text>
          </View>
        )}
      </ScrollView>

      {/* Comment input */}
      <CommentInput
        isAuthenticated={!!user}
        onSubmit={(body) => addMutation.mutate(body)}
        onLoginPress={() => router.push('/(auth)/login' as Parameters<typeof router.push>[0])}
        bottomInset={insets.bottom}
      />
    </View>
  );
}
