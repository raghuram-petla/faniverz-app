import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/common/ScreenHeader';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';
import { useCheckUsername, useSetUsername } from '@/features/auth/hooks/useUsername';
import { useProfile } from '@/features/auth/hooks/useProfile';

// @boundary: Username picker — real-time availability check with debounced DB query
// @coupling: useCheckUsername (debounced query), useSetUsername (mutation), useProfile (current value)
export default function UsernameScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: profile } = useProfile();
  // @nullable: profile?.username may be null for new users who haven't set one yet
  const [username, setUsername] = useState(profile?.username ?? '');
  // @sync: profile loads async — sync username state when profile arrives (only if user hasn't typed)
  const [hasEdited, setHasEdited] = useState(false);
  useEffect(() => {
    if (profile?.username && !hasEdited) setUsername(profile.username);
  }, [profile?.username, hasEdited]);
  // @boundary: useCheckUsername debounces and queries the DB for availability
  const { isAvailable, isChecking, error: checkError } = useCheckUsername(username);
  const setUsernameMutation = useSetUsername();

  const handleSave = async () => {
    /* istanbul ignore next -- save button is disabled when !isAvailable */
    if (!isAvailable) return;
    try {
      await setUsernameMutation.mutateAsync(username);
      router.back();
    } catch {
      // error is surfaced via mutation
    }
  };

  const statusIcon = isChecking
    ? null
    : isAvailable === true
      ? 'checkmark-circle'
      : isAvailable === false
        ? 'close-circle'
        : null;

  const statusColor = isAvailable ? palette.green500 : palette.red500;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrapper}>
          <ScreenHeader title={t('profile.chooseUsername')} />
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>{t('profile.username')}</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.prefix}>@</Text>
            <TextInput
              style={styles.input}
              placeholder="username"
              placeholderTextColor={theme.textTertiary}
              value={username}
              // @invariant: usernames are lowercase alphanumeric + underscores only
              onChangeText={(text) => {
                setHasEdited(true);
                setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            {isChecking && <ActivityIndicator size="small" color={theme.textTertiary} />}
            {statusIcon && <Ionicons name={statusIcon} size={20} color={statusColor} />}
          </View>

          {checkError && <Text style={styles.error}>{checkError}</Text>}
          {setUsernameMutation.error && (
            <Text style={styles.error}>{(setUsernameMutation.error as Error).message}</Text>
          )}

          <Text style={styles.hint}>{t('profile.usernameHint')}</Text>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!isAvailable || setUsernameMutation.isPending) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!isAvailable || setUsernameMutation.isPending}
            activeOpacity={0.8}
          >
            {setUsernameMutation.isPending ? (
              <ActivityIndicator size="small" color={palette.white} />
            ) : (
              <Text style={styles.saveText}>{t('profile.saveUsername')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    scrollContent: { paddingHorizontal: 16 },
    headerWrapper: { marginBottom: 24 },
    content: { gap: 12 },
    label: { fontSize: 14, fontWeight: '600', color: t.textSecondary },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.input,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    prefix: { fontSize: 16, fontWeight: '600', color: t.textTertiary },
    input: { flex: 1, fontSize: 16, color: t.textPrimary },
    error: { fontSize: 13, color: palette.red500 },
    hint: { fontSize: 12, color: t.textTertiary },
    saveButton: {
      backgroundColor: palette.red600,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    saveButtonDisabled: { opacity: 0.5 },
    saveText: { fontSize: 16, fontWeight: '700', color: palette.white },
  });
