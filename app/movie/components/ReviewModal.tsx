import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { StarRating } from '@/components/ui/StarRating';
import { styles } from '../[id].styles';

interface ReviewModalProps {
  visible: boolean;
  movieTitle: string;
  posterUrl: string | null;
  releaseYear: number;
  director: string | null;
  reviewRating: number;
  reviewTitle: string;
  reviewBody: string;
  containsSpoiler: boolean;
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
  onRatingChange,
  onTitleChange,
  onBodyChange,
  onSpoilerToggle,
  onSubmit,
  onClose,
}: ReviewModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Write Review</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalMovieInfo}>
            <Image
              source={{ uri: posterUrl ?? undefined }}
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
            placeholderTextColor={colors.white40}
            value={reviewTitle}
            onChangeText={onTitleChange}
          />

          <TextInput
            style={[styles.modalInput, styles.modalTextArea]}
            placeholder="Write your review..."
            placeholderTextColor={colors.white40}
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
              <Text style={styles.modalSubmitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
