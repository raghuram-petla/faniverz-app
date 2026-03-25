import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('next/font/google', () => ({
  Exo_2: () => ({ variable: '--font-exo2' }),
}));

vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

import RootLayout, { metadata } from '@/app/layout';

describe('RootLayout', () => {
  it('renders children inside providers', () => {
    // RootLayout returns <html> which can't be rendered directly in jsdom,
    // so we test the component output structure
    const result = RootLayout({ children: <div data-testid="child">Hello</div> });
    expect(result).toBeTruthy();
  });

  it('exports correct metadata', () => {
    expect(metadata.title).toBe('Faniverz Admin');
    expect(metadata.description).toBe('Admin panel for Faniverz movie app');
  });

  it('wraps children in ThemeProvider and AuthProvider', () => {
    render(
      <RootLayout>
        <div data-testid="child">Content</div>
      </RootLayout>,
    );
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('returns a valid React element with html structure', () => {
    const element = RootLayout({ children: <div>Test</div> });
    // Verify it returns a valid element with expected props
    expect(element.type).toBe('html');
    expect(element.props.lang).toBe('en');
    expect(element.props.suppressHydrationWarning).toBe(true);
    expect(element.props.className).toContain('--font-exo2');
  });
});
