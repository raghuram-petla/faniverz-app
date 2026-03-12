jest.mock('@/providers/ImageViewerProvider', () => ({
  useImageViewer: jest.fn(),
  ImageViewerProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../ImageViewerGestures', () => ({
  ImageViewerGestures: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="gesture-wrapper">{children}</View>;
  },
}));

jest.mock('@/utils/measureView', () => ({
  measureView: jest.fn((_ref: unknown, onMeasured: (layout: object) => void) =>
    onMeasured({ x: 16, y: 200, width: 200, height: 255 }),
  ),
}));

jest.mock('../ImageViewerOverlay.styles', () => ({
  overlayStyles: new Proxy({}, { get: () => ({}) }),
}));

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ImageViewerOverlay } from '../ImageViewerOverlay';

const mockOnSourceHide = jest.fn();
const mockOnSourceShow = jest.fn();

const defaultProps = {
  feedUrl: 'https://example.com/feed_md.jpg',
  fullUrl: 'https://example.com/full.jpg',
  sourceLayout: { x: 16, y: 200, width: 200, height: 255 },
  sourceRef: { current: null } as never,
  borderRadius: 12,
  onSourceHide: mockOnSourceHide,
  onSourceShow: mockOnSourceShow,
  onClose: jest.fn(),
};

describe('ImageViewerOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ImageViewerOverlay {...defaultProps} />);
  });

  it('renders close button with accessibility label', () => {
    render(<ImageViewerOverlay {...defaultProps} />);
    expect(screen.getByLabelText('Close image')).toBeTruthy();
  });

  it('renders gesture wrapper', () => {
    render(<ImageViewerOverlay {...defaultProps} />);
    expect(screen.getByTestId('gesture-wrapper')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    render(<ImageViewerOverlay {...defaultProps} onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close image'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSourceHide after open animation completes', () => {
    jest.useFakeTimers();
    render(<ImageViewerOverlay {...defaultProps} />);
    expect(mockOnSourceHide).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);
    expect(mockOnSourceHide).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('calls onSourceShow when close button is pressed', () => {
    render(<ImageViewerOverlay {...defaultProps} />);
    fireEvent.press(screen.getByLabelText('Close image'));
    expect(mockOnSourceShow).toHaveBeenCalled();
  });
});
