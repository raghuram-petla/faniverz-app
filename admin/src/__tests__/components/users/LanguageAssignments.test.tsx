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
  Pencil: (p: { className?: string }) => <span data-testid="pencil" className={p.className} />,
  X: (p: { className?: string }) => <span data-testid="x-icon" className={p.className} />,
  Search: (p: { className?: string }) => <span data-testid="search" className={p.className} />,
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

  it('renders assigned language as pill with edit button', async () => {
    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      expect(screen.getByText('Telugu')).toBeInTheDocument();
    });
    expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
  });

  it('renders all language checkboxes in modal', async () => {
    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('Edit language assignments'));

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(3);
  });

  it('checks assigned languages in modal', async () => {
    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('Edit language assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const teluguCb = checkboxes.find((cb) => cb.closest('label')?.textContent?.includes('Telugu'));
    expect(teluguCb?.checked).toBe(true);
  });

  it('shows Save button when changes are made', async () => {
    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('Edit language assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const tamilCb = checkboxes.find((cb) => cb.closest('label')?.textContent?.includes('Tamil'));
    fireEvent.click(tamilCb!);
    expect(screen.getByText('Save')).not.toBeDisabled();
  });

  it('Save button is disabled when no changes', async () => {
    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('Edit language assignments'));
    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('toggles checkbox on click in modal', async () => {
    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('Edit language assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const teluguCb = checkboxes.find((cb) => cb.closest('label')?.textContent?.includes('Telugu'));
    fireEvent.click(teluguCb!);
    expect(teluguCb!.checked).toBe(false);
  });

  it('calls save API when Save button clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ language_id: 'lang-1' }]),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(undefined) });

    wrap(<LanguageAssignments userId="user-1" roleId="admin" />);
    await waitFor(() => {
      expect(screen.getByTitle('Edit language assignments')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('Edit language assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const tamilCb = checkboxes.find((cb) => cb.closest('label')?.textContent?.includes('Tamil'));
    fireEvent.click(tamilCb!);
    fireEvent.click(screen.getByText('Save'));

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
      // No pills, just dash
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });
});
