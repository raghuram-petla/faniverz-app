import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

export default function CalendarSkeleton() {
  return (
    <View testID="calendar-skeleton" style={styles.container}>
      <Skeleton width={200} height={24} borderRadius={4} style={styles.header} />
      <View style={styles.grid}>
        {Array.from({ length: 35 }, (_, i) => (
          <Skeleton key={i} width={40} height={40} borderRadius={20} style={styles.day} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 8,
  },
  day: {
    marginVertical: 4,
  },
});
