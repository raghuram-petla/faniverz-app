import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import type { SemanticTheme } from '@shared/themes';
import ScreenHeader from '@/components/common/ScreenHeader';

const TERMS_TEXT = `Terms of Service

Last updated: March 2026

1. Acceptance of Terms
By accessing or using Faniverz ("the App"), you agree to be bound by these Terms of Service. If you do not agree, do not use the App.

2. Description of Service
Faniverz is a movie tracking and social platform that allows users to discover Telugu movies, maintain watchlists, write reviews, and follow actors.

3. User Accounts
You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 13 years old to use the App.

4. User Content
You retain ownership of content you post (reviews, comments). By posting, you grant Faniverz a non-exclusive license to display your content within the App. You agree not to post content that is illegal, abusive, or infringes on others' rights.

5. Acceptable Use
You agree not to: misuse the service, attempt unauthorized access, scrape or harvest data, impersonate others, or use the service for any illegal purpose.

6. Intellectual Property
All App content, design, and branding are owned by Faniverz. Movie data, images, and trailers are used under fair use or with appropriate licenses.

7. Termination
We may suspend or terminate your account for violations of these terms. You may delete your account at any time through the App settings.

8. Disclaimer
The App is provided "as is" without warranties. We are not liable for any damages arising from your use of the service.

9. Changes
We may update these terms. Continued use after changes constitutes acceptance.

10. Contact
For questions about these terms, contact us at faniverz@gmail.com.`;

const PRIVACY_TEXT = `Privacy Policy

Last updated: March 2026

1. Information We Collect
We collect: email address and display name (at registration), profile information you provide, movie reviews and ratings, watchlist and follow data, and device information for push notifications.

2. How We Use Your Information
We use your data to: provide and improve the App, personalize your experience, send notifications you've opted into, and maintain security.

3. Data Storage
Your data is stored securely using Supabase infrastructure. Passwords are hashed and never stored in plain text.

4. Data Sharing
We do not sell your personal data. We may share anonymized, aggregated data for analytics. We may disclose data if required by law.

5. Your Rights
You can: access and update your profile information, delete your account and associated data, opt out of notifications, and control your privacy settings.

6. Cookies and Tracking
The App does not use tracking cookies. We use minimal analytics to improve the service.

7. Children's Privacy
The App is not intended for children under 13. We do not knowingly collect data from children.

8. Data Retention
We retain your data while your account is active. Upon deletion, your data is removed within 30 days.

9. Security
We implement industry-standard security measures to protect your data.

10. Changes
We may update this policy. We will notify you of significant changes.

11. Contact
For privacy questions, contact us at faniverz@gmail.com.`;

export default function LegalScreen() {
  const { t } = useTranslation();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isTerms = type === 'terms';
  const title = isTerms ? t('settings.termsOfService') : t('settings.privacyPolicy');
  const content = isTerms ? TERMS_TEXT : PRIVACY_TEXT;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScreenHeader title={title} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.legalText}>{content}</Text>
      </ScrollView>
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
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 40,
    },
    legalText: {
      fontSize: 14,
      color: t.textSecondary,
      lineHeight: 22,
    },
  });
