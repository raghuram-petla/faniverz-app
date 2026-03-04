import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

export const styles = StyleSheet.create({
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
