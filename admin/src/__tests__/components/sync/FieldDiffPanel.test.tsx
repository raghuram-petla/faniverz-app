import { render, screen, fireEvent } from '@testing-library/react';
import { FieldDiffPanel } from '@/components/sync/FieldDiffPanel';
import type { ExistingMovieData } from '@/hooks/useSync';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

const makeMovie = (overrides: Partial<ExistingMovieData> = {}): ExistingMovieData => ({
  id: 'uuid-1',
  tmdb_id: 101,
  title: 'Baahubali',
  synopsis: null,
  poster_url: null,
  backdrop_url: null,
  trailer_url: null,
  director: null,
  runtime: null,
  genres: null,
  ...overrides,
});

const makeTmdb = (overrides = {}) => ({
  tmdbId: 101,
  title: 'Baahubali: The Beginning',
  overview: 'An epic tale',
  releaseDate: '2015-07-10',
  runtime: 159,
  genres: ['Action', 'Drama'],
  posterUrl: '/p.jpg',
  backdropUrl: '/b.jpg',
  director: 'S. S. Rajamouli',
  trailerUrl: 'https://www.youtube.com/watch?v=sOEg_YZQsTI',
  castCount: 15,
  crewCount: 5,
  ...overrides,
});

describe('FieldDiffPanel', () => {
  it('renders table headers', () => {
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('Field')).toBeInTheDocument();
    expect(screen.getAllByText('In Faniverz').length).toBeGreaterThan(0);
    expect(screen.getAllByText('In TMDB').length).toBeGreaterThan(0);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('pre-checks missing fields (synopsis, poster, etc.)', () => {
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    // synopsis is missing → checkbox pre-checked
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    // At least some checkboxes should be checked (missing fields)
    expect(checkboxes.some((c) => c.checked)).toBe(true);
  });

  it('hides rows with "same" status (only actionable rows shown)', () => {
    const movie = makeMovie({ title: 'Baahubali: The Beginning' });
    const tmdb = makeTmdb({ title: 'Baahubali: The Beginning' });
    render(
      <FieldDiffPanel
        movie={movie}
        tmdb={tmdb}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    // Title is identical — its row should not appear
    expect(screen.queryByText('same')).not.toBeInTheDocument();
  });

  it('shows "changed" status when DB and TMDB differ', () => {
    const movie = makeMovie({ title: 'Old Title', director: 'Wrong Director' });
    render(
      <FieldDiffPanel
        movie={movie}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    const changedLabels = screen.getAllByText('changed');
    expect(changedLabels.length).toBeGreaterThan(0);
  });

  it('shows "missing" status label for null DB fields', () => {
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    const missingLabels = screen.getAllByText('missing');
    expect(missingLabels.length).toBeGreaterThan(0);
  });

  it('shows TMDB director value in table', () => {
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('S. S. Rajamouli')).toBeInTheDocument();
  });

  it('shows cast count from TMDB', () => {
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('15 cast · 5 crew from TMDB')).toBeInTheDocument();
  });

  it('calls onApply with selected fields when Apply button is clicked', async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={onApply}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Apply/i }));
    expect(onApply).toHaveBeenCalled();
    const [fields, forceResyncCast] = onApply.mock.calls[0];
    expect(Array.isArray(fields)).toBe(true);
    expect(forceResyncCast).toBe(false);
  });

  it('disables Apply button when no fields are selected', () => {
    // All fields filled → all "same" → nothing pre-checked → button disabled
    const full = makeMovie({
      title: 'Baahubali: The Beginning',
      synopsis: 'An epic tale',
      poster_url: '/r2/poster.jpg',
      backdrop_url: '/r2/backdrop.jpg',
      trailer_url: 'https://youtu.be/yt',
      director: 'S. S. Rajamouli',
      runtime: 159,
      genres: ['Action', 'Drama'],
    });
    const tmdb = makeTmdb({
      title: 'Baahubali: The Beginning',
      overview: 'An epic tale',
      runtime: 159,
      genres: ['Action', 'Drama'],
      director: 'S. S. Rajamouli',
    });
    render(
      <FieldDiffPanel
        movie={full}
        tmdb={tmdb}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    // Apply button is hidden entirely when no fields are actionable
    expect(screen.queryByRole('button', { name: /Apply/i })).not.toBeInTheDocument();
  });

  it('passes forceResyncCast=true when cast re-sync checkbox is checked', () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={onApply}
      />,
    );
    // Find and check the cast re-sync checkbox
    const castCheckbox = screen.getByRole('checkbox', {
      name: /Re-sync cast/i,
    }) as HTMLInputElement;
    fireEvent.click(castCheckbox);
    fireEvent.click(screen.getByRole('button', { name: /Apply/i }));
    expect(onApply).toHaveBeenCalled();
    const [, forceResyncCast] = onApply.mock.calls[0];
    expect(forceResyncCast).toBe(true);
  });

  it('shows applied fields with strikethrough and checkmark', () => {
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={['synopsis']}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    // Synopsis label should have line-through class
    const synopsisLabel = screen.getByText('Synopsis');
    expect(synopsisLabel.className).toContain('line-through');
  });
});
