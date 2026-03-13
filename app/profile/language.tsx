import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';
import i18n from '@/i18n';
import { STORAGE_KEYS } from '@/constants/storage';
import ScreenHeader from '@/components/common/ScreenHeader';

const LANG_STORAGE_KEY = STORAGE_KEYS.PREFERRED_LANG;

interface Language {
  code: string;
  label: string;
  native: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'te', label: 'Telugu', native: 'Telugu' },
];

// @boundary: Language picker — currently supports English and Telugu
// @coupling: i18n singleton from @/i18n, AsyncStorage for persistence across app restarts
export default function LanguageScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string>(i18n.language ?? 'en');
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // @sideeffect: persists language choice to AsyncStorage then triggers i18n re-render
  // @sync: local state, AsyncStorage, and i18n language must all stay in sync
  const handleSelect = async (code: string) => {
    setSelected(code);
    await AsyncStorage.setItem(LANG_STORAGE_KEY, code);
    await i18n.changeLanguage(code);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <ScreenHeader title={t('settings.language')} />

      {/* Language options */}
      <View style={styles.optionsList}>
        {LANGUAGES.map((lang) => {
          const isSelected = selected === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={styles.optionRow}
              onPress={() => handleSelect(lang.code)}
              activeOpacity={0.7}
            >
              {/* Radio circle */}
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>

              {/* Labels */}
              <View style={styles.labelGroup}>
                <Text style={styles.langLabel}>{lang.label}</Text>
                {lang.native !== lang.label && <Text style={styles.langNative}>{lang.native}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
      paddingHorizontal: 16,
    },

    // Options list
    optionsList: {
      backgroundColor: t.surfaceElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      overflow: 'hidden',
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: t.surfaceElevated,
      gap: 14,
    },

    // Radio button
    radio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: t.textDisabled,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      borderColor: palette.red600,
      backgroundColor: palette.red600,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: palette.white,
    },

    // Labels
    labelGroup: {
      flex: 1,
      gap: 2,
    },
    langLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: t.textPrimary,
    },
    langNative: {
      fontSize: 13,
      color: t.textSecondary,
    },
  });
