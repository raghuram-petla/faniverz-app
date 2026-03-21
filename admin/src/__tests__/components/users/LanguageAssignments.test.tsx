import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageAssignments } from '@/components/users/LanguageAssignments';

const mockLanguages = [
  { id: 'lang-1', name: 'Telugu' },
  { id: 'lang-2', name: 'Tamil' },
  { id: 'lang-3', name: 'Hindi' },
];

vi.mock('@/hooks/useLanguageContext', () => ({
  useLanguageContext: () => ({
    languages: mockLanguages,
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

vi.mock('lucide-react', () => ({
  Loader2: (p: { className?: string }) => <span data-testid="loader" className={p.className} />,
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([{ language_id: 'lang-1' }]),
  });
});

describe('LanguageAssignments', () => {
  it('returns null when roleId is not admin', () => {
    const { container } = wrap(<LanguageAssignments userId="user-1" roleId="super_admin" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders for admin role', async () => {
    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      expect(screen.getByText('Language Access')).toBeInTheDocument();
    });
  });

  it('renders all language checkboxes', async () => {
    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
      expect(screen.getByText('Tamil')).toBeInTheDocument();
      expect(screen.getByText('Hindi')).toBeInTheDocument();
    });
  });

  it('checks assigned languages', async () => {
    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      // lang-1 (Telugu) should be checked from mock response
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[2]).not.toBeChecked();
    });
  });

  it('shows Save button when changes are made', async () => {
    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });
    // Toggle Tamil on — creates a change
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(screen.getByText('Save Languages')).toBeInTheDocument();
  });

  it('does not show Save button when no changes', async () => {
    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });
    expect(screen.queryByText('Save Languages')).not.toBeInTheDocument();
  });

  it('toggles checkbox on click', async () => {
    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });
    const checkboxes = screen.getAllByRole('checkbox');
    // Uncheck Telugu
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).not.toBeChecked();
  });

  it('calls save API when Save button clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ language_id: 'lang-1' }]),
      })
      .mockResolvedValueOnce({ ok: true });

    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });

    // Toggle Tamil to create change
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByText('Save Languages'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/user-languages',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('lang-1'),
        }),
      );
    });
  });

  it('handles fetch error gracefully (returns empty array)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((cb) => expect(cb).not.toBeChecked());
    });
  });
});
