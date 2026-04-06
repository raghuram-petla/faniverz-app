import { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { colors } from '@/theme/colors';
import { CRAFT_NAMES, CRAFT_LABELS } from '@shared/constants';
import { CraftRatingRow } from './CraftRatingRow';
import { AgreeDisagreePoll } from './AgreeDisagreePoll';
import { createStyles } from './EditorialReviewSection.styles';
import type { EditorialReviewWithUserData, CraftName } from '@shared/types';

// @contract renders editorial review section on movie detail page
// @boundary renders nothing when review is null (no empty state placeholder)
export interface EditorialReviewSectionProps {
  review: EditorialReviewWithUserData;
  onPollVote: (vote: 'agree' | 'disagree') => void;
  onCraftRate: (craft: CraftName, rating: number) => void;
}

const COLLAPSED_LINES = 3;

// @coupling useEditorialReview, usePollVoteMutation, useCraftRatingMutation in parent
export function EditorialReviewSection({
  review,
  onPollVote,
  onCraftRate,
}: EditorialReviewSectionProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);

  const getUserCraftRating = useCallback(
    (craft: CraftName): number | null => {
      const key = `user_craft_rating_${craft}` as keyof EditorialReviewWithUserData;
      return (review[key] as number | null) ?? null;
    },
    [review],
  );

  const getAvgUserRating = useCallback(
    (craft: CraftName): number | null => {
      const key = `avg_user_${craft}` as keyof EditorialReviewWithUserData;
      return (review[key] as number | null) ?? null;
    },
    [review],
  );

  return (
    <View style={styles.container}>
      {/* Header: badge only (author display reserved for future) */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('editorial.title', 'EDITORIAL REVIEW')}</Text>
        </View>
      </View>

      {/* Overall Rating */}
      <View style={styles.overallRow}>
        <Text style={styles.overallLabel}>{t('editorial.overallRating', 'Overall Rating')}</Text>
        <View style={styles.overallRating}>
          <Ionicons name="star" size={20} color={colors.yellow400} />
          <Text style={styles.overallValue}>{review.overall_rating.toFixed(1)}</Text>
          <Text style={styles.overallMax}>/ 5</Text>
        </View>
      </View>

      {/* Craft Ratings */}
      <View style={styles.craftSection}>
        <View style={styles.craftHeader}>
          <Text style={styles.craftHeaderLabel}>{t('editorial.craft', 'Craft')}</Text>
          <View style={{ flexDirection: 'row', gap: 40 }}>
            <Text style={styles.craftHeaderLabel}>{t('editorial.editor', 'Editor')}</Text>
            <Text style={styles.craftHeaderLabel}>{t('editorial.you', 'You')}</Text>
          </View>
        </View>
        {CRAFT_NAMES.map((craft) => (
          <CraftRatingRow
            key={craft}
            label={CRAFT_LABELS[craft]}
            editorRating={review[`rating_${craft}` as keyof EditorialReviewWithUserData] as number}
            userRating={getUserCraftRating(craft)}
            avgUserRating={getAvgUserRating(craft)}
            onRate={(rating) => onCraftRate(craft, rating)}
          />
        ))}
        {review.user_rating_count > 0 && (
          <Text style={styles.userRatingCount}>
            {t('editorial.usersRated', '{{count}} users rated', {
              count: review.user_rating_count,
            })}
          </Text>
        )}
      </View>

      <View style={styles.divider} />

      {/* Verdict */}
      {review.verdict && <Text style={styles.verdict}>"{review.verdict}"</Text>}

      {/* Body */}
      <Text style={styles.body} numberOfLines={expanded ? undefined : COLLAPSED_LINES}>
        {review.body}
      </Text>
      {!expanded && review.body.length > 150 && (
        <Pressable onPress={() => setExpanded(true)}>
          <Text style={styles.readMore}>{t('editorial.readMore', 'Read more')}</Text>
        </Pressable>
      )}

      <View style={styles.divider} />

      {/* Agree/Disagree Poll */}
      <AgreeDisagreePoll
        agreeCount={review.agree_count}
        disagreeCount={review.disagree_count}
        userVote={review.user_poll_vote}
        onVote={onPollVote}
      />
    </View>
  );
}
