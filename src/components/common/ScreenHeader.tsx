import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { SemanticTheme } from '@shared/themes';

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
  const navigation = useNavigation();
  const state = navigation.getState();

  // Show home button when 2+ screens are pushed on top of the root (tabs)
  const stackDepth = state?.index ?? 0;
  const showHome = forceShowHome ?? stackDepth >= 2;

  const homeButton = showHome ? (
    <TouchableOpacity
      style={styles.homeButton}
      onPress={() => router.dismissAll()}
      activeOpacity={0.7}
      accessibilityLabel="Go to home"
      testID="home-button"
    >
      <Ionicons name="home-outline" size={22} color={theme.textPrimary} />
    </TouchableOpacity>
  ) : null;

  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack ?? (() => router.back())}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name={backIcon} size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        {homeButton}
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
    homeButton: {
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
