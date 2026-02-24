import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  backIcon?: 'arrow-back' | 'chevron-back';
  titleBadge?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export default function ScreenHeader({
  title,
  onBack,
  backIcon = 'chevron-back',
  titleBadge,
  rightAction,
}: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack ?? (() => router.back())}
        activeOpacity={0.7}
        accessibilityLabel="Go back"
      >
        <Ionicons name={backIcon} size={24} color={colors.white} />
      </TouchableOpacity>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {titleBadge}
      </View>

      {rightAction ?? <View style={styles.placeholder} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white10,
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
    color: colors.white,
  },
  placeholder: {
    width: 40,
  },
});
