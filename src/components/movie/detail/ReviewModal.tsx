import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { StarRating } from '@/components/ui/StarRating';
import { createStyles } from '@/styles/movieDetail.styles';
import { getImageUrl } from '@shared/imageUrl';

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
  const styles = createStyles(theme);
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isEditing ? 'Edit Review' : 'Write Review'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalMovieInfo}>
            <Image
              source={{ uri: getImageUrl(posterUrl, 'sm') ?? undefined }}
              style={styles.modalPoster}
              contentFit="cover"
            />
            <View>
              <Text style={styles.modalMovieTitle}>{movieTitle}</Text>
              <Text style={styles.modalMovieMeta}>
                {releaseYear} • {director}
              </Text>
            </View>
          </View>

          <View style={styles.modalStars}>
            <StarRating rating={reviewRating} size={40} interactive onRate={onRatingChange} />
          </View>

          <TextInput
            style={styles.modalInput}
            placeholder="Review Title"
            placeholderTextColor={theme.textTertiary}
            value={reviewTitle}
            onChangeText={onTitleChange}
          />

          <TextInput
            style={[styles.modalInput, styles.modalTextArea]}
            placeholder="Write your review..."
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
            <Text style={styles.spoilerToggleText}>Contains Spoiler</Text>
          </TouchableOpacity>

          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmitButton, reviewRating === 0 && { opacity: 0.5 }]}
              onPress={onSubmit}
              disabled={reviewRating === 0}
            >
              <Text style={styles.modalSubmitText}>{isEditing ? 'Update' : 'Submit'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
