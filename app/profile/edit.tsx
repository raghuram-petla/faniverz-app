import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import ScreenHeader from '@/components/common/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useUpdateProfile } from '@/features/auth/hooks/useUpdateProfile';
import { useTheme } from '@/theme';
import { PLACEHOLDER_AVATAR } from '@/constants/placeholders';
import { createStyles } from '@/styles/profile/edit.styles';

const BIO_LIMIT = 150;

export default function EditProfileScreen() {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile, isPending: isSaving } = useUpdateProfile();

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
      Alert.alert('Bio too long', `Please keep your bio under ${BIO_LIMIT} characters.`);
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
          Alert.alert('Saved', 'Your profile has been updated.');
          router.back();
        },
        onError: () => {
          Alert.alert('Error', 'Failed to save your profile. Please try again.');
        },
      },
    );
  };

  const avatarUrl = profile?.avatar_url ?? PLACEHOLDER_AVATAR;
  const email = user?.email ?? '';
  const bioOverLimit = bio.length > BIO_LIMIT;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.red600} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <ScreenHeader title="Edit Profile" />

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarWrapper}>
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.avatarOverlay}>
            <Ionicons name="camera" size={20} color={theme.textPrimary} />
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert('Coming Soon', 'Photo upload will be available in a future update.')
          }
        >
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Full Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Full Name</Text>
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
              placeholder="Your full name"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Email (disabled) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email</Text>
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
          <Text style={styles.fieldHint}>Email cannot be changed here.</Text>
        </View>

        {/* Phone */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Phone</Text>
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
          <Text style={styles.fieldLabel}>Location</Text>
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
              placeholder="City, Country"
              placeholderTextColor={theme.textTertiary}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Bio */}
        <View style={styles.fieldGroup}>
          <View style={styles.bioLabelRow}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <Text style={[styles.bioCounter, bioOverLimit && styles.bioCounterOver]}>
              {bio.length}/{BIO_LIMIT}
            </Text>
          </View>
          <View style={[styles.inputWrapper, styles.bioWrapper, bioOverLimit && styles.inputError]}>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us a bit about yourself…"
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
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
