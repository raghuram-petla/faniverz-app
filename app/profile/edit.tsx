import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import ScreenHeader from '@/components/common/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useUpdateProfile } from '@/features/auth/hooks/useUpdateProfile';
import { useAvatarUpload } from '@/features/profile/hooks/useAvatarUpload';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { PLACEHOLDER_AVATAR } from '@/constants/placeholders';
import { createStyles } from '@/styles/profile/edit.styles';
import { EditProfileSkeleton } from '@/components/profile/EditProfileSkeleton';
import { getImageUrl } from '@shared/imageUrl';

const BIO_LIMIT = 150;

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile, isPending: isSaving } = useUpdateProfile();
  const { pickAndUpload, isUploading } = useAvatarUpload();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setPhone(profile.phone ?? '');
      setLocation(profile.location ?? '');
      setBio(profile.bio ?? '');
    }
  }, [profile]);

  const handleSave = () => {
    if (bio.length > BIO_LIMIT) {
      Alert.alert(t('profile.bioTooLong'), t('profile.bioTooLongMessage', { limit: BIO_LIMIT }));
      return;
    }
    updateProfile(
      {
        display_name: displayName.trim(),
        phone: phone.trim(),
        location: location.trim(),
        bio: bio.trim(),
      },
      {
        onSuccess: () => {
          Alert.alert(t('common.saved'), t('profile.profileUpdated'));
          router.back();
        },
        onError: () => {
          Alert.alert(t('common.error'), t('profile.profileSaveFailed'));
        },
      },
    );
  };

  const avatarUrl = getImageUrl(profile?.avatar_url ?? null, 'md') ?? PLACEHOLDER_AVATAR;
  const email = user?.email ?? '';
  const bioOverLimit = bio.length > BIO_LIMIT;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <EditProfileSkeleton />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ScreenHeader title={t('profile.editProfile')} />

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {isUploading ? (
              <View style={[styles.avatar, styles.avatarLoading]}>
                <ActivityIndicator size="small" color={colors.red600} />
              </View>
            ) : (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
              />
            )}
            <View style={styles.avatarOverlay}>
              <Ionicons name="camera" size={20} color={theme.textPrimary} />
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={pickAndUpload} disabled={isUploading}>
            <Text style={styles.changePhotoText}>
              {isUploading ? t('profile.uploading') : t('profile.changePhoto')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('profile.fullName')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={18}
                color={theme.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('profile.fullNamePlaceholder')}
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Email (disabled) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('profile.email')}</Text>
            <View style={[styles.inputWrapper, styles.inputDisabled]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={theme.textDisabled}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.inputTextDisabled]}
                value={email}
                editable={false}
                selectTextOnFocus={false}
                placeholderTextColor={theme.textDisabled}
              />
              <Ionicons name="lock-closed-outline" size={14} color={theme.textDisabled} />
            </View>
            <Text style={styles.fieldHint}>{t('profile.emailHint')}</Text>
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('profile.phone')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="call-outline"
                size={18}
                color={theme.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={theme.textTertiary}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Location */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('profile.location')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="location-outline"
                size={18}
                color={theme.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder={t('profile.locationPlaceholder')}
                placeholderTextColor={theme.textTertiary}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <View style={styles.bioLabelRow}>
              <Text style={styles.fieldLabel}>{t('profile.bio')}</Text>
              <Text style={[styles.bioCounter, bioOverLimit && styles.bioCounterOver]}>
                {bio.length}/{BIO_LIMIT}
              </Text>
            </View>
            <View
              style={[styles.inputWrapper, styles.bioWrapper, bioOverLimit && styles.inputError]}
            >
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder={t('profile.bioPlaceholder')}
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.textPrimary} />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color={theme.textPrimary} />
              <Text style={styles.saveButtonText}>{t('profile.saveChanges')}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
