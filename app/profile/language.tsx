import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/theme/colors';
import i18n from '@/i18n';

const LANG_STORAGE_KEY = 'preferred_lang';

interface Language {
  code: string;
  label: string;
  native: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(i18n.language ?? 'en');

  const handleSelect = async (code: string) => {
    setSelected(code);
    await AsyncStorage.setItem(LANG_STORAGE_KEY, code);
    await i18n.changeLanguage(code);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Language</Text>
        <View style={styles.headerPlaceholder} />
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    paddingHorizontal: 16,
    paddingTop: 56,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  headerPlaceholder: {
    width: 40,
  },

  // Options list
  optionsList: {
    backgroundColor: colors.white5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white10,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.white5,
    gap: 14,
  },

  // Radio button
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.white30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.red600,
    backgroundColor: colors.red600,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
  },

  // Labels
  labelGroup: {
    flex: 1,
    gap: 2,
  },
  langLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  langNative: {
    fontSize: 13,
    color: colors.white60,
  },
});
