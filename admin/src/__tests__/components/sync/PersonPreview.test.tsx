import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/useSync', () => ({}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn() },
  },
}));

import { PersonPreview } from '@/components/sync/PersonPreview';
import type { LookupResult } from '@/hooks/useSync';

function makePersonResult(
  overrides: Partial<{
    existsInDb: boolean;
    existingId: string | null;
    name: string;
    biography: string | null;
    birthday: string | null;
    placeOfBirth: string | null;
    photoUrl: string | null;
    gender: number;
  }> = {},
): LookupResult & { type: 'person' } {
  return {
    type: 'person',
    existsInDb: overrides.existsInDb ?? false,
    existingId: overrides.existingId ?? null,
    data: {
      tmdbPersonId: 456,
      name: overrides.name ?? 'Test Actor',
      biography: overrides.biography ?? null,
      birthday: overrides.birthday ?? null,
      placeOfBirth: overrides.placeOfBirth ?? null,
      photoUrl: overrides.photoUrl ?? null,
      gender: overrides.gender ?? 0,
    },
  } as LookupResult & { type: 'person' };
}

describe('PersonPreview', () => {
  it('renders person name', () => {
    const result = makePersonResult({ name: 'Allu Arjun' });
    render(<PersonPreview result={result} isPending={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('Allu Arjun')).toBeInTheDocument();
  });

  it('renders photo when photoUrl is provided', () => {
    const result = makePersonResult({
      name: 'Photo Person',
      photoUrl: 'https://example.com/photo.jpg',
    });
    render(<PersonPreview result={result} isPending={false} onRefresh={vi.fn()} />);
    const img = screen.getByAltText('Photo Person') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/photo.jpg');
  });

  it('renders placeholder when photoUrl is null', () => {
    const result = makePersonResult({ photoUrl: null });
    render(<PersonPreview result={result} isPending={false} onRefresh={vi.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('displays birthday when provided', () => {
    const result = makePersonResult({ birthday: '1983-04-08' });
    render(<PersonPreview result={result} isPending={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('1983-04-08')).toBeInTheDocument();
  });

  it('shows dash for missing birthday', () => {
    const result = makePersonResult({ birthday: null });
    render(<PersonPreview result={result} isPending={false} onRefresh={vi.fn()} />);
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('displays place of birth when provided', () => {
    const result = makePersonResult({ placeOfBirth: 'Chennai, India' });
    render(<PersonPreview result={result} isPending={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('Chennai, India')).toBeInTheDocument();
  });

  it('shows biography when provided', () => {
    const result = makePersonResult({ biography: 'A famous actor' });
    render(<PersonPreview result={result} isPending={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('A famous actor')).toBeInTheDocument();
  });

  it('hides biography paragraph when biography is null', () => {
    const result = makePersonResult({ biography: null });
    render(<PersonPreview result={result} isPending={false} onRefresh={vi.fn()} />);
    expect(screen.queryByText('A famous actor')).not.toBeInTheDocument();
  });

  it('shows "In database" and refresh button when person exists in DB', () => {
    const result = makePersonResult({ existsInDb: true, existingId: 'actor-1' });
    render(<PersonPreview result={result} isPending={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('In database')).toBeInTheDocument();
    expect(screen.getByText('Refresh from TMDB')).toBeInTheDocument();
  });

  it('shows "Not in database" and "Import Actor" button when person is not in DB', () => {
    const result = makePersonResult({ existsInDb: false });
    render(
      <PersonPreview result={result} isPending={false} onRefresh={vi.fn()} onImport={vi.fn()} />,
    );
    expect(screen.getByText('Not in database')).toBeInTheDocument();
    expect(screen.getByText('Import Actor')).toBeInTheDocument();
  });

  it('does not show refresh button when person is not in DB', () => {
    const result = makePersonResult({ existsInDb: false });
    render(<PersonPreview result={result} isPending={false} onRefresh={vi.fn()} />);
    expect(screen.queryByText('Refresh from TMDB')).not.toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = vi.fn();
    const result = makePersonResult({ existsInDb: true, existingId: 'actor-1' });
    render(<PersonPreview result={result} isPending={false} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText('Refresh from TMDB'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables refresh button when isPending is true', () => {
    const result = makePersonResult({ existsInDb: true, existingId: 'actor-1' });
    render(<PersonPreview result={result} isPending={true} onRefresh={vi.fn()} />);
    const btn = screen.getByText('Refresh from TMDB').closest('button')!;
    expect(btn).toBeDisabled();
  });
});
