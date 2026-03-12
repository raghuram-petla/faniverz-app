import { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';
import { StarRating } from '@/components/ui/StarRating';
import { createStyles } from '@/styles/movieDetail.styles';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { useTranslation } from 'react-i18next';

interface ReviewModalProps {
  visible: boolean;
  movieTitle: string;
  posterUrl: string | null;
  releaseYear: number | null;
  director: string | null;
  reviewRating: number;
  reviewTitle: string;
  reviewBody: string;
  containsSpoiler: boolean;
  isEditing?: boolean;
  onRatingChange: (rating: number) => void;
  onTitleChange: (title: string) => void;
  onBodyChange: (body: string) => void;
  onSpoilerToggle: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function ReviewModal({
  visible,
  movieTitle,
  posterUrl,
  releaseYear,
  director,
  reviewRating,
  reviewTitle,
  reviewBody,
  containsSpoiler,
  isEditing = false,
  onRatingChange,
  onTitleChange,
  onBodyChange,
  onSpoilerToggle,
  onSubmit,
  onClose,
}: ReviewModalProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const animationsEnabled = useAnimationsEnabled();

  const contentScale = useSharedValue(1);
  useEffect(() => {
    if (visible) {
      if (animationsEnabled) {
        contentScale.value = 0.95;
        contentScale.value = withSpring(1, { damping: 12, stiffness: 180 });
      } else {
        contentScale.value = 1;
      }
    }
  }, [visible, contentScale, animationsEnabled]);
  const springStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
  }));

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalContent, springStyle]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditing ? t('movie.editReview') : t('movie.writeReview')}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={colors.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalMovieInfo}>
                <Image
                  source={{ uri: getImageUrl(posterUrl, 'sm') ?? PLACEHOLDER_POSTER }}
                  style={styles.modalPoster}
                  contentFit="cover"
                />
                <View>
                  <Text style={styles.modalMovieTitle}>{movieTitle}</Text>
                  {(releaseYear || director) && (
                    <Text style={styles.modalMovieMeta}>
                      {[releaseYear, director].filter(Boolean).join(' • ')}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.modalStars}>
                <StarRating rating={reviewRating} size={40} interactive onRate={onRatingChange} />
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder={t('movie.reviewTitle')}
                placeholderTextColor={theme.textTertiary}
                value={reviewTitle}
                onChangeText={onTitleChange}
              />

              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder={t('movie.writeYourReview')}
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={reviewBody}
                onChangeText={onBodyChange}
              />

              <TouchableOpacity style={styles.spoilerToggle} onPress={onSpoilerToggle}>
                <View style={[styles.toggleTrack, containsSpoiler && styles.toggleTrackActive]}>
                  <View style={[styles.toggleThumb, containsSpoiler && styles.toggleThumbActive]} />
                </View>
                <Text style={styles.spoilerToggleText}>{t('movie.containsSpoiler')}</Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitButton, reviewRating === 0 && { opacity: 0.5 }]}
                  onPress={onSubmit}
                  disabled={reviewRating === 0}
                >
                  <Text style={styles.modalSubmitText}>
                    {isEditing ? t('movie.update') : t('movie.submit')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
