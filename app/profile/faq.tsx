import { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import ScreenHeader from '@/components/common/ScreenHeader';
import { FaqAccordion, FAQ_ITEMS } from '@/components/profile/FaqAccordion';

export default function FaqScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(
    () => ({
      container: { flex: 1, backgroundColor: theme.background },
      content: { paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 48 },
    }),
    [theme, insets.top],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title={t('settings.faq')} />
      <FaqAccordion items={FAQ_ITEMS} theme={theme} />
    </ScrollView>
  );
}
