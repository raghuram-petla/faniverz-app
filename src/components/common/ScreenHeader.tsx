import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { HomeButton } from './HomeButton';
import type { SemanticTheme } from '@shared/themes';

/**
 * @contract Three-column row: [back + home] | [title + badge] | [rightAction | 40px spacer].
 * @coupling HomeButton — delegates deep-stack home navigation.
 * @invariant placeholder View renders when rightAction is absent to preserve centered title.
 */
interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  backIcon?: 'arrow-back' | 'chevron-back';
  titleBadge?: React.ReactNode;
  rightAction?: React.ReactNode;
  /** Force-show the home button (useful inside nested stacks where auto-detection underestimates depth) */
  forceShowHome?: boolean;
}

export default function ScreenHeader({
  title,
  onBack,
  backIcon = 'chevron-back',
  titleBadge,
  rightAction,
  forceShowHome,
}: ScreenHeaderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <TouchableOpacity
          style={styles.backButton}
          // @edge Falls back to router.back() when onBack is not provided
          onPress={onBack ?? (() => router.back())}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name={backIcon} size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <HomeButton forceShow={forceShowHome} />
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {titleBadge}
      </View>

      {rightAction ?? <View style={styles.placeholder} />}
    </View>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    leftGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 40,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: t.textPrimary,
    },
    placeholder: {
      width: 40,
    },
  });
