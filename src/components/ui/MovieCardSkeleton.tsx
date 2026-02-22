import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

export default function MovieCardSkeleton() {
  return (
    <View testID="movie-card-skeleton" style={styles.container}>
      <Skeleton width={120} height={180} borderRadius={8} />
      <Skeleton width={100} height={14} style={styles.title} />
      <Skeleton width={80} height={12} style={styles.subtitle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    marginRight: 12,
  },
  title: {
    marginTop: 8,
  },
  subtitle: {
    marginTop: 4,
  },
});
