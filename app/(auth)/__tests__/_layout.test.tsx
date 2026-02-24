jest.mock('expo-router', () => ({
  Stack: Object.assign(({ children }: { children: React.ReactNode }) => children, {
    Screen: () => null,
  }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import AuthLayout from '../_layout';

describe('AuthLayout', () => {
  it('renders without crashing', () => {
    expect(() => render(<AuthLayout />)).not.toThrow();
  });
});
