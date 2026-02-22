import React from 'react';
import { render, screen } from '@testing-library/react-native';
import OttBadge from '../OttBadge';

describe('OttBadge', () => {
  it('renders platform name', () => {
    render(<OttBadge platformName="Netflix" />);
    expect(screen.getByText('Netflix')).toBeTruthy();
  });

  it('renders with custom color', () => {
    render(<OttBadge platformName="Aha" color="#E50914" />);
    const badge = screen.getByTestId('ott-badge');
    expect(badge.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#E50914' })])
    );
  });

  it('uses default color when none provided', () => {
    render(<OttBadge platformName="Prime Video" />);
    const badge = screen.getByTestId('ott-badge');
    expect(badge.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#666666' })])
    );
  });
});
