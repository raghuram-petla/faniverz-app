import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

export default function MovieDetailSkeleton() {
  return (
    <View testID="movie-detail-skeleton" style={styles.container}>
      <Skeleton width="100%" height={220} borderRadius={0} />
      <View style={styles.content}>
        <Skeleton width={200} height={24} style={styles.title} />
        <Skeleton width={150} height={16} style={styles.subtitle} />
        <View style={styles.chips}>
          <Skeleton width={60} height={24} borderRadius={12} />
          <Skeleton width={70} height={24} borderRadius={12} />
          <Skeleton width={50} height={24} borderRadius={12} />
        </View>
        <Skeleton width="100%" height={80} style={styles.synopsis} />
        <Skeleton width={120} height={18} style={styles.sectionHeader} />
        <View style={styles.castRow}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} width={64} height={64} borderRadius={32} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  synopsis: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  castRow: {
    flexDirection: 'row',
    gap: 16,
  },
});
