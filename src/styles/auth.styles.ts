import { StyleSheet } from 'react-native';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

export const createLoginStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
    closeRow: { alignItems: 'flex-end' as const, marginBottom: 8 },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.input,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    logoContainer: { alignItems: 'center', marginBottom: 40 },
    logoFull: { height: 60, width: 167, marginBottom: 16 },
    tagline: { fontSize: 14, color: t.textTertiary, marginTop: 8 },
    errorText: { fontSize: 13, color: palette.red500, marginBottom: 8, paddingHorizontal: 4 },
    socialSection: { marginBottom: 16 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: t.textDisabled },
    dividerText: { fontSize: 12, color: t.textTertiary, marginHorizontal: 16, fontWeight: '600' },
    guestButton: {
      height: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.textDisabled,
      alignItems: 'center',
      justifyContent: 'center',
    },
    guestButtonText: { fontSize: 16, fontWeight: '600', color: t.textPrimary },
  });
