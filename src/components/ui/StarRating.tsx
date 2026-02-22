import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = 20,
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const { colors } = useTheme();

  const handlePress = (star: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(star);
    }
  };

  const stars = Array.from({ length: maxStars }, (_, i) => {
    const starNumber = i + 1;
    const isFilled = starNumber <= Math.floor(rating);
    const isHalf = !isFilled && starNumber <= rating + 0.5 && starNumber > rating;

    let symbol = '☆';
    if (isFilled) symbol = '★';
    else if (isHalf) symbol = '★';

    return (
      <TouchableOpacity
        key={starNumber}
        testID={`star-${starNumber}`}
        onPress={() => handlePress(starNumber)}
        disabled={!interactive}
        accessibilityRole={interactive ? 'button' : 'text'}
        accessibilityLabel={`${starNumber} star${starNumber > 1 ? 's' : ''}`}
        style={styles.starButton}
      >
        <Text
          style={[
            { fontSize: size },
            isFilled || isHalf ? { color: colors.accent } : { color: colors.textTertiary },
          ]}
        >
          {symbol}
        </Text>
      </TouchableOpacity>
    );
  });

  return (
    <View
      testID="star-rating"
      style={styles.container}
      accessibilityRole={interactive ? 'adjustable' : 'text'}
      accessibilityLabel={`Rating: ${rating} out of ${maxStars}`}
    >
      {stars}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    padding: 2,
  },
});
