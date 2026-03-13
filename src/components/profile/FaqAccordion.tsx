import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { SemanticTheme } from '@shared/themes';

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'settings.faqQ1',
    answer: 'settings.faqA1',
  },
  {
    question: 'settings.faqQ2',
    answer: 'settings.faqA2',
  },
  {
    question: 'settings.faqQ3',
    answer: 'settings.faqA3',
  },
];

export interface FaqAccordionProps {
  items: FaqItem[];
  theme: SemanticTheme;
}

export function FaqAccordion({ items, theme }: FaqAccordionProps) {
  const { t } = useTranslation();
  /** @invariant only one FAQ item can be expanded at a time; null = all collapsed */
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const styles = createStyles(theme);

  /** @contract toggling an already-expanded item collapses it (accordion behavior) */
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
              accessibilityLabel={t(item.question)}
            >
              <Text style={styles.questionText} numberOfLines={2}>
                {t(item.question)}
              </Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.textDisabled}
              />
            </TouchableOpacity>
            {isExpanded && (
              <View style={[styles.answerContainer, !isLast && styles.rowBorder]}>
                <Text style={styles.answerText}>{t(item.answer)}</Text>
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
