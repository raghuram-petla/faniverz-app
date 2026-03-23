import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { MovieListItem } from '@/components/movie/MovieListItem';
import { createStyles } from '@/styles/tabs/calendar.styles';
import type { Movie, OTTPlatform } from '@/types';

// @contract DateGroupItem renders a single date group: date header + movie cards
// @coupling Shares styles with calendar.tsx via createStyles from calendar.styles

export interface DateGroupItemProps {
  item: { date: string; movies: Movie[]; movieDate: Date };
  today: Date;
  platformMap: Record<string, OTTPlatform[]>;
}

// @contract Three visual states: past (dimmed), today (red highlight), upcoming (violet)
export function DateGroupItem({ item, today, platformMap }: DateGroupItemProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isPast = item.movieDate < today;
  const isToday = item.movieDate.toDateString() === today.toDateString();

  return (
    <View style={styles.dateGroup}>
      {/* Date Header */}
      <View style={styles.dateHeader}>
        <View
          style={[
            styles.dateBox,
            isToday && styles.dateBoxToday,
            !isToday && !isPast && styles.dateBoxUpcoming,
            isPast && styles.dateBoxPast,
          ]}
        >
          <Text
            style={[
              styles.dateBoxMonth,
              isToday && { color: colors.white },
              isPast && { color: theme.textTertiary },
              !isToday && !isPast && { color: colors.violet400 },
            ]}
          >
            {item.movieDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
          </Text>
          <Text
            style={[
              styles.dateBoxDay,
              isToday && { color: colors.white },
              isPast && { color: theme.textTertiary },
            ]}
          >
            {item.movieDate.getDate()}
          </Text>
        </View>
        <View style={styles.dateInfo}>
          <Text
            style={[
              styles.dateWeekday,
              isToday && { color: colors.red500 },
              isPast && { color: theme.textTertiary },
            ]}
          >
            {item.movieDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </Text>
          <Text style={[styles.dateFull, isPast && { color: theme.textDisabled }]}>
            {item.movieDate.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          {isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>{t('calendar.today')}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.releaseCount, isPast && { color: theme.textDisabled }]}>
          {item.movies.length === 1
            ? t('calendar.release', { count: 1 })
            : t('calendar.releases', { count: item.movies.length })}
        </Text>
      </View>

      {/* Movie Cards */}
      {item.movies.map((movie) => (
        <MovieListItem
          key={movie.id}
          movie={movie}
          platforms={platformMap[movie.id]}
          isPast={isPast}
        />
      ))}
    </View>
  );
}
