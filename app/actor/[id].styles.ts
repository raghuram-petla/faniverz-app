import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

export const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background },
    content: { paddingHorizontal: 16, paddingBottom: 48 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    headerSection: {
      marginBottom: 16,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      position: 'absolute',
      left: 0,
      top: 0,
      zIndex: 1,
    },
    navButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarCenter: {
      alignItems: 'center',
      paddingTop: 4,
    },

    actorName: {
      fontSize: 24,
      fontWeight: '800',
      color: t.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    badgeRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 20,
    },
    typeBadge: {
      backgroundColor: colors.red600,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    typeBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.white,
      textTransform: 'uppercase',
    },
    genderBadge: {
      backgroundColor: t.input,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    genderBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: t.textSecondary,
    },

    bioCard: {
      backgroundColor: t.surfaceElevated,
      borderRadius: 12,
      padding: 16,
      gap: 12,
      marginBottom: 24,
    },
    bioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    bioLabel: { fontSize: 14, color: t.textTertiary },
    bioValue: { fontSize: 14, fontWeight: '600', color: t.textPrimary, flex: 1 },

    aboutSection: { marginBottom: 24 },
    aboutTitle: { fontSize: 18, fontWeight: '700', color: t.textPrimary, marginBottom: 8 },
    aboutText: { fontSize: 14, color: t.textSecondary, lineHeight: 22 },
    readMoreText: { fontSize: 14, fontWeight: '600', color: colors.red400, marginTop: 6 },

    filmographyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    filmographyTitle: { fontSize: 18, fontWeight: '700', color: t.textPrimary },
    countBadge: {
      backgroundColor: colors.red600,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      minWidth: 24,
      alignItems: 'center',
    },
    countBadgeText: { fontSize: 12, fontWeight: '700', color: colors.white },

    filmographyList: { gap: 12 },
    filmCard: {
      flexDirection: 'row',
      gap: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    filmPoster: {
      width: 64,
      aspectRatio: 2 / 3,
      borderRadius: 8,
    },
    filmInfo: { flex: 1, justifyContent: 'center', gap: 2 },
    filmTitle: { fontSize: 16, fontWeight: '600', color: t.textPrimary },
    filmYear: { fontSize: 13, color: t.textTertiary },
    filmRole: { fontSize: 13, color: t.textSecondary },
    filmRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    filmRatingValue: { fontSize: 13, fontWeight: '600', color: t.textSecondary },

    // Photo modal
    photoOverlay: {
      flex: 1,
      backgroundColor: t.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoCloseButton: {
      position: 'absolute',
      right: 16,
      zIndex: 10,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: t.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoFull: {
      width: '90%',
      aspectRatio: 3 / 4,
      borderRadius: 16,
    },
  });
