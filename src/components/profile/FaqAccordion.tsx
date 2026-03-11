import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SemanticTheme } from '@shared/themes';

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Why do I see a heart icon sometimes and a bookmark icon other times?',
    answer:
      "The heart icon appears for movies that haven't released on OTT yet — tapping it follows the movie so you get updates about trailers, release dates, and streaming availability. Once a movie is available on a streaming platform, the icon switches to a bookmark so you can save it to your watchlist.",
  },
  {
    question: 'What does following a movie do?',
    answer:
      "Following a movie keeps you in the loop. You'll get notified when a new trailer drops, when the release date changes, or when the movie becomes available on a streaming platform.",
  },
  {
    question: 'What is the watchlist?',
    answer:
      "The watchlist is your personal collection of movies you want to watch. When a movie is streaming on OTT, you can save it to your watchlist and mark it as watched once you've seen it.",
  },
];

export interface FaqAccordionProps {
  items: FaqItem[];
  theme: SemanticTheme;
}

export function FaqAccordion({ items, theme }: FaqAccordionProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const styles = createStyles(theme);

  const toggle = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <View style={styles.card}>
      {items.map((item, index) => {
        const isExpanded = expandedIndex === index;
        const isLast = index === items.length - 1;
        return (
          <View key={index}>
            <TouchableOpacity
              style={[styles.questionRow, !isLast && !isExpanded && styles.rowBorder]}
              onPress={() => toggle(index)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={item.question}
            >
              <Text style={styles.questionText} numberOfLines={2}>
                {item.question}
              </Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.textDisabled}
              />
            </TouchableOpacity>
            {isExpanded && (
              <View style={[styles.answerContainer, !isLast && styles.rowBorder]}>
                <Text style={styles.answerText}>{item.answer}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surfaceElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      overflow: 'hidden',
    },
    questionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    questionText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: t.textPrimary,
    },
    answerContainer: {
      paddingHorizontal: 16,
      paddingBottom: 14,
    },
    answerText: {
      fontSize: 13,
      lineHeight: 20,
      color: t.textSecondary,
    },
  });
