import { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import type { SemanticTheme } from '@shared/themes';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useUpdateProfile } from '@/features/auth/hooks/useUpdateProfile';
import ScreenHeader from '@/components/common/ScreenHeader';
import { colors as palette } from '@shared/colors';

// @boundary: Privacy toggles — controls profile and watchlist visibility
// @coupling: useProfile reads, useUpdateProfile writes to profiles table boolean columns
export default function PrivacySettingsScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  // @nullable: defaults to true (public) when profile hasn't loaded — matches DB column defaults
  const isProfilePublic = profile?.is_profile_public ?? true;
  const isWatchlistPublic = profile?.is_watchlist_public ?? true;

  // @sideeffect: persists privacy toggle to Supabase profiles table
  // @contract: isPending guard prevents duplicate mutations from rapid taps
  const handleToggleProfile = () => {
    if (updateProfile.isPending) return;
    updateProfile.mutate(
      { is_profile_public: !isProfilePublic },
      {
        onError: (err) =>
          Alert.alert(
            t('common.error'),
            err instanceof Error ? err.message : t('profile.updateFailed'),
          ),
      },
    );
  };

  // @contract: isPending guard prevents duplicate mutations from rapid taps
  const handleToggleWatchlist = () => {
    if (updateProfile.isPending) return;
    updateProfile.mutate(
      { is_watchlist_public: !isWatchlistPublic },
      {
        onError: (err) =>
          Alert.alert(
            t('common.error'),
            err instanceof Error ? err.message : t('profile.updateFailed'),
          ),
      },
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top + 12 }]}>
        <ActivityIndicator size="large" color={colors.red600} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScreenHeader title={t('settings.privacySettings')} />

      <View style={styles.section}>
        <Text style={styles.sectionDesc}>{t('profile.privacyDescription')}</Text>

        <View style={styles.card}>
          <ToggleRow
            label={t('profile.showProfilePublicly')}
            description={t('profile.showProfilePubliclyDesc')}
            value={isProfilePublic}
            onToggle={handleToggleProfile}
            styles={styles}
          />
          <View style={styles.divider} />
          <ToggleRow
            label={t('profile.showWatchlist')}
            description={t('profile.showWatchlistDesc')}
            value={isWatchlistPublic}
            onToggle={handleToggleWatchlist}
            styles={styles}
          />
        </View>
      </View>
    </View>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
}

function ToggleRow({ label, description, value, onToggle, styles }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.8}
        style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}
      >
        <View style={[styles.toggleThumb, value ? styles.toggleThumbOn : styles.toggleThumbOff]} />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background, paddingHorizontal: 16 },
    centered: { justifyContent: 'center', alignItems: 'center' },
    section: { paddingTop: 8 },
    sectionDesc: { fontSize: 14, color: t.textSecondary, lineHeight: 20, marginBottom: 20 },
    card: { backgroundColor: t.surfaceElevated, borderRadius: 12, overflow: 'hidden' },
    divider: { height: 1, backgroundColor: t.border, marginHorizontal: 16 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    rowText: { flex: 1, marginRight: 12 },
    rowLabel: { fontSize: 15, fontWeight: '600', color: t.textPrimary, marginBottom: 2 },
    rowDesc: { fontSize: 13, color: t.textTertiary, lineHeight: 18 },
    toggle: {
      width: 48,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    toggleOn: { backgroundColor: palette.red600 },
    toggleOff: { backgroundColor: t.border },
    toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: palette.white },
    toggleThumbOn: { alignSelf: 'flex-end' as const },
    toggleThumbOff: { alignSelf: 'flex-start' as const },
  });
