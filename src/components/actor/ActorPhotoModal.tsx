import { useEffect } from 'react';
import { Modal, Pressable, TouchableOpacity } from 'react-native';
import { setStatusBarHidden } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { PLACEHOLDER_PHOTO } from '@/constants/placeholders';

/** @contract: props for the full-screen actor photo modal overlay */
export interface ActorPhotoModalProps {
  visible: boolean;
  photoUrl: string | null;
  onClose: () => void;
  topInset: number;
  textPrimaryColor: string;
  styles: {
    photoOverlay: Record<string, unknown>;
    photoCloseButton: Record<string, unknown>;
    photoFull: Record<string, unknown>;
  };
}

/** @coupling: style keys (photoOverlay, photoCloseButton, photoFull) come from actorDetail.styles */
export const ActorPhotoModal = ({
  visible,
  photoUrl,
  onClose,
  topInset,
  textPrimaryColor,
  styles,
}: ActorPhotoModalProps) => {
  // @sideeffect Hide status bar when fullscreen photo modal opens; restore on close.
  useEffect(() => {
    setStatusBarHidden(visible, 'fade');
    return () => setStatusBarHidden(false, 'fade');
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent testID="photo-modal">
      <Pressable style={styles.photoOverlay} onPress={onClose} testID="photo-overlay">
        <TouchableOpacity
          style={[styles.photoCloseButton, { top: topInset + 12 }]}
          onPress={onClose}
          accessibilityLabel="Close photo"
          testID="photo-close"
        >
          <Ionicons name="close" size={28} color={textPrimaryColor} />
        </TouchableOpacity>
        <Pressable onPress={/* istanbul ignore next */ (e) => e.stopPropagation()}>
          <Image
            source={{ uri: photoUrl ?? PLACEHOLDER_PHOTO }}
            style={styles.photoFull}
            contentFit="contain"
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};
