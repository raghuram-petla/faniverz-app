jest.mock('expo-router', () => ({
  Stack: Object.assign(({ children }: { children: React.ReactNode }) => children, {
    Screen: () => null,
  }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import ProfileLayout from '../_layout';

describe('ProfileLayout', () => {
  it('renders without crashing', () => {
    expect(() => render(<ProfileLayout />)).not.toThrow();
  });
});
