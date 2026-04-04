import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActorPhotoModal } from '../ActorPhotoModal';

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_PHOTO: 'https://placeholder.com/photo.jpg',
}));

const mockStyles = {
  photoOverlay: { flex: 1 },
  photoCloseButton: { position: 'absolute' as const },
  photoFull: { width: 300, height: 400 },
};

describe('ActorPhotoModal', () => {
  const defaultProps = {
    visible: true,
    photoUrl: 'https://example.com/photo.jpg',
    onClose: jest.fn(),
    topInset: 47,
    textPrimaryColor: '#ffffff',
    styles: mockStyles,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when visible', () => {
    const { getByTestId } = render(<ActorPhotoModal {...defaultProps} />);
    expect(getByTestId('photo-modal')).toBeTruthy();
  });

  it('calls onClose when overlay is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<ActorPhotoModal {...defaultProps} onClose={onClose} />);
    fireEvent.press(getByTestId('photo-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<ActorPhotoModal {...defaultProps} onClose={onClose} />);
    fireEvent.press(getByTestId('photo-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has Close photo accessibility label', () => {
    const { getByLabelText } = render(<ActorPhotoModal {...defaultProps} />);
    expect(getByLabelText('Close photo')).toBeTruthy();
  });

  it('uses placeholder when photoUrl is null', () => {
    const { getByTestId } = render(<ActorPhotoModal {...defaultProps} photoUrl={null} />);
    expect(getByTestId('photo-modal')).toBeTruthy();
  });

  it('renders with visible=false', () => {
    const { queryByTestId } = render(<ActorPhotoModal {...defaultProps} visible={false} />);
    expect(queryByTestId('photo-overlay')).toBeNull();
  });
});
