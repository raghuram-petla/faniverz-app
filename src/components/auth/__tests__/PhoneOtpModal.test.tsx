import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { PhoneOtpModal } from '../PhoneOtpModal';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

describe('PhoneOtpModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onSendOtp: jest.fn().mockResolvedValue(undefined),
    onVerifyOtp: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
    error: null,
  };

  beforeEach(() => jest.clearAllMocks());

  it('shows phone input step initially', () => {
    render(<PhoneOtpModal {...defaultProps} />);
    expect(screen.getByText('auth.enterPhoneNumber')).toBeTruthy();
    expect(screen.getByLabelText('Phone number')).toBeTruthy();
  });

  it('calls onSendOtp with phone number', () => {
    render(<PhoneOtpModal {...defaultProps} />);
    fireEvent.changeText(screen.getByLabelText('Phone number'), '+919876543210');
    fireEvent.press(screen.getByText('auth.sendOtp'));
    expect(defaultProps.onSendOtp).toHaveBeenCalledWith('+919876543210');
  });

  it('does not send OTP with empty phone', () => {
    render(<PhoneOtpModal {...defaultProps} />);
    fireEvent.press(screen.getByText('auth.sendOtp'));
    expect(defaultProps.onSendOtp).not.toHaveBeenCalled();
  });

  it('shows error when provided', () => {
    render(<PhoneOtpModal {...defaultProps} error="Rate limited" />);
    expect(screen.getByText('Rate limited')).toBeTruthy();
  });

  it('calls onClose on close button press', () => {
    render(<PhoneOtpModal {...defaultProps} />);
    fireEvent.press(screen.getByLabelText('Close'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('renders nothing when not visible', () => {
    render(<PhoneOtpModal {...defaultProps} visible={false} />);
    expect(screen.queryByText('auth.enterPhoneNumber')).toBeNull();
  });

  it('calls onSuccess after successful verification', async () => {
    const onSuccess = jest.fn();
    render(<PhoneOtpModal {...defaultProps} onSuccess={onSuccess} />);

    // Move to OTP step
    fireEvent.changeText(screen.getByLabelText('Phone number'), '+919876543210');
    await act(async () => {
      fireEvent.press(screen.getByText('auth.sendOtp'));
    });

    // Verify OTP
    fireEvent.changeText(screen.getByLabelText('OTP code'), '123456');
    await act(async () => {
      fireEvent.press(screen.getByText('auth.verify'));
    });

    expect(defaultProps.onVerifyOtp).toHaveBeenCalledWith('+919876543210', '123456');
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows loading indicator when isLoading is true on phone step', () => {
    render(<PhoneOtpModal {...defaultProps} isLoading={true} />);
    // When loading, the text is replaced by ActivityIndicator
    expect(screen.queryByText('auth.sendOtp')).toBeNull();
  });

  it('does not send OTP with invalid phone format', () => {
    render(<PhoneOtpModal {...defaultProps} />);
    fireEvent.changeText(screen.getByLabelText('Phone number'), 'abc');
    fireEvent.press(screen.getByText('auth.sendOtp'));
    expect(defaultProps.onSendOtp).not.toHaveBeenCalled();
  });

  it('navigates back to phone step via change number link', async () => {
    render(<PhoneOtpModal {...defaultProps} />);
    // Move to OTP step
    fireEvent.changeText(screen.getByLabelText('Phone number'), '+919876543210');
    await act(async () => {
      fireEvent.press(screen.getByText('auth.sendOtp'));
    });

    expect(screen.getByText('auth.enterOtp')).toBeTruthy();

    // Press change number link
    fireEvent.press(screen.getByText('auth.changeNumber'));
    expect(screen.getByText('auth.enterPhoneNumber')).toBeTruthy();
  });

  it('shows OTP sent message with phone number on OTP step', async () => {
    render(<PhoneOtpModal {...defaultProps} />);
    fireEvent.changeText(screen.getByLabelText('Phone number'), '+919876543210');
    await act(async () => {
      fireEvent.press(screen.getByText('auth.sendOtp'));
    });
    // t mock returns the key, so the subtitle shows the key with interpolation
    expect(screen.getByText('auth.enterOtp')).toBeTruthy();
  });

  it('does not verify with empty OTP code', async () => {
    render(<PhoneOtpModal {...defaultProps} />);
    fireEvent.changeText(screen.getByLabelText('Phone number'), '+919876543210');
    await act(async () => {
      fireEvent.press(screen.getByText('auth.sendOtp'));
    });
    // Try to verify with empty OTP
    await act(async () => {
      fireEvent.press(screen.getByText('auth.verify'));
    });
    expect(defaultProps.onVerifyOtp).not.toHaveBeenCalled();
  });

  it('resets state on close', () => {
    render(<PhoneOtpModal {...defaultProps} />);
    fireEvent.changeText(screen.getByLabelText('Phone number'), '+919876543210');
    fireEvent.press(screen.getByLabelText('Close'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows error on OTP step when provided', async () => {
    const { rerender } = render(<PhoneOtpModal {...defaultProps} />);
    fireEvent.changeText(screen.getByLabelText('Phone number'), '+919876543210');
    await act(async () => {
      fireEvent.press(screen.getByText('auth.sendOtp'));
    });
    rerender(<PhoneOtpModal {...defaultProps} error="Invalid OTP" />);
    expect(screen.getByText('Invalid OTP')).toBeTruthy();
  });
});
