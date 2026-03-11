import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';

export interface PhoneOtpModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSendOtp: (phone: string) => Promise<void>;
  onVerifyOtp: (phone: string, token: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function PhoneOtpModal({
  visible,
  onClose,
  onSuccess,
  onSendOtp,
  onVerifyOtp,
  isLoading,
  error,
}: PhoneOtpModalProps) {
  const { theme } = useTheme();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  const handleSend = async () => {
    if (!phone.trim()) return;
    try {
      await onSendOtp(phone.trim());
      setStep('otp');
    } catch {
      // error surfaced via props
    }
  };

  const handleVerify = async () => {
    if (!otp.trim()) return;
    try {
      await onVerifyOtp(phone.trim(), otp.trim());
      handleClose();
      onSuccess?.();
    } catch {
      // error surfaced via props
    }
  };

  const handleClose = () => {
    setPhone('');
    setOtp('');
    setStep('phone');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent testID="phone-otp-modal">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surfaceElevated }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {step === 'phone' ? 'Enter Phone Number' : 'Enter OTP'}
            </Text>
            <TouchableOpacity onPress={handleClose} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {step === 'phone' ? (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, color: theme.textPrimary }]}
                placeholder="+91 9876543210"
                placeholderTextColor={theme.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                accessibilityLabel="Phone number"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.disabled]}
                onPress={handleSend}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={palette.white} />
                ) : (
                  <Text style={styles.submitText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                OTP sent to {phone}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, color: theme.textPrimary }]}
                placeholder="6-digit OTP"
                placeholderTextColor={theme.textTertiary}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel="OTP code"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.disabled]}
                onPress={handleVerify}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={palette.white} />
                ) : (
                  <Text style={styles.submitText}>Verify</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('phone')} style={styles.backLink}>
                <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Change number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  error: {
    fontSize: 13,
    color: palette.red500,
    marginBottom: 8,
  },
  submitBtn: {
    height: 52,
    backgroundColor: palette.red600,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.white,
  },
  disabled: {
    opacity: 0.6,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 12,
  },
});
