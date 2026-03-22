import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetSession = vi.fn();
const mockFetch = vi.fn();
const mockUseLanguageContext = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

vi.mock('@/hooks/useLanguageContext', () => ({
  useLanguageContext: () => mockUseLanguageContext(),
}));

// Mock global fetch
global.fetch = mockFetch;

import { LanguageAssignments } from '@/components/users/LanguageAssignments';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('LanguageAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
    });

    mockUseLanguageContext.mockReturnValue({
      languages: [
        { id: 'lang-te', name: 'Telugu', code: 'te' },
        { id: 'lang-hi', name: 'Hindi', code: 'hi' },
        { id: 'lang-ta', name: 'Tamil', code: 'ta' },
      ],
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ language_id: 'lang-te' }],
    });
  });

  it('returns null when roleId is not "admin"', () => {
    const { container } = render(<LanguageAssignments userId="user-1" roleId="viewer" />, {
      wrapper: makeWrapper(),
    });
    expect(container.firstChild).toBeNull();
  });

  it('returns null when roleId is "root"', () => {
    const { container } = render(<LanguageAssignments userId="user-1" roleId="root" />, {
      wrapper: makeWrapper(),
    });
    expect(container.firstChild).toBeNull();
  });

  it('shows loading spinner while fetching assignments', () => {
    // Delay the fetch so we can observe loading state
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<LanguageAssignments userId="user-1" roleId="admin" />, {
      wrapper: makeWrapper(),
    });
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders language checkboxes after loading', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });
    expect(screen.getByText('Hindi')).toBeInTheDocument();
    expect(screen.getByText('Tamil')).toBeInTheDocument();
  });

  it('pre-checks the assigned language checkbox', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    // Telugu is the first — should be checked (it was in assignments)
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(false);
    expect(checkboxes[2].checked).toBe(false);
  });

  it('does not show Save button when no changes', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });

    // No changes made — Save button should not appear
    expect(screen.queryByText('Save Languages')).not.toBeInTheDocument();
  });

  it('shows Save button when toggling a checkbox', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });

    // Toggle Hindi (currently unchecked)
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(checkboxes[1]);

    expect(screen.getByText('Save Languages')).toBeInTheDocument();
  });

  it('hides Save button after toggling back to original state', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });

    // Toggle Telugu off (was on)
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(checkboxes[0]);
    expect(screen.getByText('Save Languages')).toBeInTheDocument();

    // Toggle Telugu back on
    fireEvent.click(checkboxes[0]);
    expect(screen.queryByText('Save Languages')).not.toBeInTheDocument();
  });

  it('calls POST /api/user-languages with selected language ids on save', async () => {
    // After save, invalidation will refetch
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ language_id: 'lang-te' }],
      })
      .mockResolvedValue({
        ok: true,
        json: async () => undefined,
      });

    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });

    // Toggle Hindi
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByText('Save Languages'));

    await waitFor(() => {
      const postCall = mockFetch.mock.calls.find(
        (call) => call[0] === '/api/user-languages' && call[1]?.method === 'POST',
      );
      expect(postCall).toBeTruthy();
    });
  });

  it('shows error message when save fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ language_id: 'lang-te' }],
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Save failed' }),
      });

    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByText('Save Languages'));

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  it('returns empty set when assignments query returns error (non-ok response)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => [],
    });

    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    // None checked since assignments returned empty
    expect(checkboxes.every((c) => !c.checked)).toBe(true);
  });

  it('renders Language Access heading', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Language Access')).toBeInTheDocument();
    });
  });
});
