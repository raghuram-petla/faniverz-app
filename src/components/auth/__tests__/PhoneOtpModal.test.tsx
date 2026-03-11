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
});
