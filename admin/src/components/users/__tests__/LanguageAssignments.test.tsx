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

vi.mock('lucide-react', () => ({
  Loader2: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="loader-icon" {...props} />,
  Pencil: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="pencil-icon" {...props} />,
  X: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="x-icon" {...props} />,
  Search: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="search-icon" {...props} />,
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
    expect(container.querySelector('[data-testid="loader-icon"]')).toBeInTheDocument();
  });

  it('renders assigned language as pill after loading', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });
    expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
  });

  it('shows dash when no languages assigned', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  it('opens modal when edit button is clicked', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit language assignments'));

    expect(screen.getByText('Edit Language Assignments')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('shows all languages as checkboxes in the modal', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit language assignments'));

    // All 3 languages should appear in the modal
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(3);
  });

  it('pre-checks the assigned language in the modal', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit language assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    // Telugu (lang-te) should be checked — it's first in sorted order (selected first)
    const teluguCb = checkboxes.find((cb) => {
      const label = cb.closest('label');
      return label?.textContent?.includes('Telugu');
    });
    expect(teluguCb?.checked).toBe(true);
  });

  it('Save button is disabled when no changes', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit language assignments'));

    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('Save button becomes enabled after toggling a checkbox', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit language assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const hindiCb = checkboxes.find((cb) => {
      const label = cb.closest('label');
      return label?.textContent?.includes('Hindi');
    });
    fireEvent.click(hindiCb!);

    expect(screen.getByText('Save')).not.toBeDisabled();
  });

  it('closes modal when Cancel is clicked', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit language assignments'));
    expect(screen.getByText('Edit Language Assignments')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Edit Language Assignments')).not.toBeInTheDocument();
  });

  it('closes modal when backdrop is clicked', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit language assignments'));
    expect(screen.getByText('Edit Language Assignments')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lang-modal-backdrop'));
    expect(screen.queryByText('Edit Language Assignments')).not.toBeInTheDocument();
  });

  it('calls POST /api/user-languages on save', async () => {
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
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit language assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const hindiCb = checkboxes.find((cb) => {
      const label = cb.closest('label');
      return label?.textContent?.includes('Hindi');
    });
    fireEvent.click(hindiCb!);
    fireEvent.click(screen.getByText('Save'));

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
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit language assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const hindiCb = checkboxes.find((cb) => {
      const label = cb.closest('label');
      return label?.textContent?.includes('Hindi');
    });
    fireEvent.click(hindiCb!);
    fireEvent.click(screen.getByText('Save'));

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
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  it('shows error message when save fails with unparseable JSON response', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ language_id: 'lang-te' }],
      })
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockRejectedValue(new Error('parse error')),
      });

    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit language assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const hindiCb = checkboxes.find((cb) => {
      const label = cb.closest('label');
      return label?.textContent?.includes('Hindi');
    });
    fireEvent.click(hindiCb!);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('handles session expired error in getAccessToken', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    // Should still render the edit button
    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });
  });

  it('closes modal when X button is clicked', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit language assignments'));
    expect(screen.getByText('Edit Language Assignments')).toBeInTheDocument();

    const xButton = screen.getByTestId('x-icon').closest('button')!;
    fireEvent.click(xButton);
    expect(screen.queryByText('Edit Language Assignments')).not.toBeInTheDocument();
  });

  it('detects hasChanges when selected differs from assignments', async () => {
    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit language assignments'));

    // Uncheck Telugu, check Hindi — same size but different content
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const teluguCb = checkboxes.find((cb) => cb.closest('label')?.textContent?.includes('Telugu'));
    const hindiCb = checkboxes.find((cb) => cb.closest('label')?.textContent?.includes('Hindi'));
    fireEvent.click(teluguCb!);
    fireEvent.click(hindiCb!);

    expect(screen.getByText('Save')).not.toBeDisabled();
  });

  it('falls back to language id when assigned language_id is not in languages context', async () => {
    // Return an assignment for 'unknown-lang-id' which is not in the languages list
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ language_id: 'unknown-lang-id' }],
    });

    render(<LanguageAssignments userId="user-1" roleId="admin" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      // The pill should show the raw id since it's not in langMap
      expect(screen.getByText('unknown-lang-id')).toBeInTheDocument();
    });
  });
});
