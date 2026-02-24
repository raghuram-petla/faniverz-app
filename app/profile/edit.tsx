import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useUpdateProfile } from '@/features/auth/hooks/useUpdateProfile';
import { colors } from '@/theme/colors';

const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';
const BIO_LIMIT = 150;

export default function EditProfileScreen() {
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerPlaceholder} />
      </View>

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
            <Ionicons name="camera" size={20} color={colors.white} />
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
              color={colors.white40}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your full name"
              placeholderTextColor={colors.white30}
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
              color={colors.white20}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, styles.inputTextDisabled]}
              value={email}
              editable={false}
              selectTextOnFocus={false}
              placeholderTextColor={colors.white20}
            />
            <Ionicons name="lock-closed-outline" size={14} color={colors.white20} />
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
              color={colors.white40}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.white30}
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
              color={colors.white40}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="City, Country"
              placeholderTextColor={colors.white30}
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
              placeholderTextColor={colors.white30}
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
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color={colors.white} />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 48,
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

  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
    width: 128,
    height: 128,
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: colors.white10,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.red600,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.black,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.red500,
  },

  // Form
  form: {
    gap: 20,
    marginBottom: 32,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white60,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.white30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.white10,
    gap: 10,
  },
  inputIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.white,
  },
  inputDisabled: {
    backgroundColor: colors.white5,
    opacity: 0.6,
  },
  inputTextDisabled: {
    color: colors.white40,
  },
  inputError: {
    borderColor: colors.red600,
  },

  // Bio
  bioLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bioCounter: {
    fontSize: 12,
    color: colors.white40,
  },
  bioCounterOver: {
    color: colors.red500,
    fontWeight: '600',
  },
  bioWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  bioInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },

  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.red600,
    borderRadius: 12,
    paddingVertical: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
