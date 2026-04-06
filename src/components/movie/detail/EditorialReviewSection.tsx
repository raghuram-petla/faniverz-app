import { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { colors } from '@/theme/colors';
import { CRAFT_NAMES, CRAFT_LABELS } from '@shared/constants';
import { PLACEHOLDER_AVATAR } from '@/constants/placeholders';
import { CraftRatingRow } from './CraftRatingRow';
import { AgreeDisagreePoll } from './AgreeDisagreePoll';
import { createStyles } from './EditorialReviewSection.styles';
import type { EditorialReviewWithUserData } from '@shared/types';

// @contract renders editorial review section — editor craft ratings (read-only) + poll
// @boundary user craft ratings are collected in ReviewModal, not here
export interface EditorialReviewSectionProps {
  review: EditorialReviewWithUserData;
  onPollVote: (vote: 'agree' | 'disagree') => void;
}

const COLLAPSED_LINES = 3;

export function EditorialReviewSection({ review, onPollVote }: EditorialReviewSectionProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header: badge + author */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('editorial.title', 'EDITORIAL REVIEW')}</Text>
        </View>
        {review.author_display_name && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4 }}>
            <Image
              source={review.author_avatar_url || PLACEHOLDER_AVATAR}
              style={{ width: 22, height: 22, borderRadius: 11 }}
            />
            <Text style={styles.authorName}>{review.author_display_name}</Text>
          </View>
        )}
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

      {/* Craft Ratings (editor only, read-only) */}
      <View style={styles.craftSection}>
        {CRAFT_NAMES.map((craft) => (
          <CraftRatingRow
            key={craft}
            label={CRAFT_LABELS[craft]}
            editorRating={review[`rating_${craft}` as keyof EditorialReviewWithUserData] as number}
          />
        ))}
      </View>

      <View style={styles.divider} />

      {/* Review Title */}
      {review.title && <Text style={styles.verdict}>{review.title}</Text>}

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
