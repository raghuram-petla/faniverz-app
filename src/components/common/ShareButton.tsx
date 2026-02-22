import React from 'react';
import { TouchableOpacity, Text, Share, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface ShareButtonProps {
  title: string;
  releaseDate: string;
}

export default function ShareButton({ title, releaseDate }: ShareButtonProps) {
  const { colors } = useTheme();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${title} releases on ${releaseDate}! Track it on Faniverz`,
      });
    } catch {
      // User cancelled or share failed — no action needed
    }
  };

  return (
    <TouchableOpacity
      testID="share-button"
      style={[styles.button, { borderColor: colors.border }]}
      onPress={handleShare}
      accessibilityLabel={`Share ${title}`}
      accessibilityRole="button"
    >
      <Text style={[styles.icon, { color: colors.text }]}>↗</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
});
