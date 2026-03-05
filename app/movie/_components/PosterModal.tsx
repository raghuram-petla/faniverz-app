import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { MoviePoster } from '@/types';
import { createStyles } from '../_styles/[id].styles';

interface PosterModalProps {
  poster: MoviePoster | null;
  onClose: () => void;
}

export function PosterModal({ poster, onClose }: PosterModalProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  return (
    <Modal visible={!!poster} animationType="fade" transparent>
      <View style={styles.posterModalOverlay}>
        <TouchableOpacity
          style={styles.posterModalClose}
          onPress={onClose}
          accessibilityLabel="Close poster"
        >
          <Ionicons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
        {poster && (
          <View style={styles.posterModalContent}>
            <Image
              source={{ uri: poster.image_url }}
              style={styles.posterModalImage}
              contentFit="contain"
            />
            <View style={styles.posterModalInfo}>
              <Text style={styles.posterModalTitle}>{poster.title}</Text>
              {poster.description && (
                <Text style={styles.posterModalDescription}>{poster.description}</Text>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
