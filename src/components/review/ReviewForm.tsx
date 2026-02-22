import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import StarRating from '@/components/ui/StarRating';
import type { ReviewInsert, ReviewUpdate } from '@/types/review';
import type { ReviewWithProfile } from '@/features/reviews/api';

interface ReviewFormProps {
  existingReview?: ReviewWithProfile | null;
  onSubmit: (data: ReviewInsert | ReviewUpdate) => void;
  isPending?: boolean;
  movieId: number;
}

export default function ReviewForm({
  existingReview,
  onSubmit,
  isPending,
  movieId,
}: ReviewFormProps) {
  const { colors } = useTheme();
  const isEdit = !!existingReview;

  const [rating, setRating] = React.useState(existingReview?.rating ?? 0);
  const [title, setTitle] = React.useState(existingReview?.title ?? '');
  const [body, setBody] = React.useState(existingReview?.body ?? '');
  const [isSpoiler, setIsSpoiler] = React.useState(existingReview?.is_spoiler ?? false);
  const [error, setError] = React.useState('');

  const handleSubmit = () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    setError('');

    if (isEdit) {
      const updates: ReviewUpdate = {
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
        is_spoiler: isSpoiler,
      };
      onSubmit(updates);
    } else {
      const insert: ReviewInsert = {
        movie_id: movieId,
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
        is_spoiler: isSpoiler,
      };
      onSubmit(insert);
    }
  };

  return (
    <View testID="review-form" style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>Your Rating *</Text>
      <StarRating rating={rating} interactive onRatingChange={setRating} size={32} />
      {error ? (
        <Text testID="form-error" style={[styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
      ) : null}

      <Text style={[styles.label, { color: colors.text }]}>Title</Text>
      <TextInput
        testID="review-title-input"
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        value={title}
        onChangeText={(t) => setTitle(t.slice(0, 100))}
        placeholder="Review title (optional)"
        placeholderTextColor={colors.textTertiary}
        maxLength={100}
      />
      <Text testID="title-char-count" style={[styles.charCount, { color: colors.textTertiary }]}>
        {title.length}/100
      </Text>

      <Text style={[styles.label, { color: colors.text }]}>Review</Text>
      <TextInput
        testID="review-body-input"
        style={[styles.textArea, { borderColor: colors.border, color: colors.text }]}
        value={body}
        onChangeText={(t) => setBody(t.slice(0, 2000))}
        placeholder="Write your review (optional)"
        placeholderTextColor={colors.textTertiary}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        maxLength={2000}
      />
      <Text testID="body-char-count" style={[styles.charCount, { color: colors.textTertiary }]}>
        {body.length}/2000
      </Text>

      <View style={styles.spoilerRow}>
        <Text style={[styles.spoilerLabel, { color: colors.text }]}>Contains spoilers</Text>
        <Switch
          testID="spoiler-toggle"
          value={isSpoiler}
          onValueChange={setIsSpoiler}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>

      <TouchableOpacity
        testID="submit-review"
        style={[
          styles.submitButton,
          { backgroundColor: colors.primary, opacity: isPending ? 0.6 : 1 },
        ]}
        onPress={handleSubmit}
        disabled={isPending}
      >
        <Text style={styles.submitText}>
          {isPending ? 'Saving...' : isEdit ? 'Update' : 'Post'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  spoilerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  spoilerLabel: {
    fontSize: 15,
  },
  errorText: {
    fontSize: 13,
    marginTop: 4,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
